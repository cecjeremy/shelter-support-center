import { resolve } from 'path';
import { Construct } from 'constructs';
import { Aws, Duration, RemovalPolicy, Stack, StackProps, Tags, CfnOutput } from 'aws-cdk-lib';
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  Policy,
  User,
  ServicePrincipal,
  IRole
} from 'aws-cdk-lib/aws-iam';
import { Bucket, IBucket, BlockPublicAccess, BucketEncryption, EventType, CfnBucket } from 'aws-cdk-lib/aws-s3';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { CfnDeliveryStream } from 'aws-cdk-lib/aws-kinesisfirehose';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { LogGroup, LogStream, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { VfNodejsFunction } from '@voicefoundry-cloud/cdk-resources';
import { S3BucketReplication } from '../constructs/S3BucketReplication';

export interface CalabrioQmStackProps extends StackProps {
  prefix: string;
  stage: string;
  ctrStream: Stream;
  atrStream: Stream;
  encryptionKey: Key;
  recordingBucket: IBucket;
  // Bucket Replication Props
  dataBucket: CfnBucket;
  dataBucketRecordingsPrefix: string;
  dataBucketReportsPrefix: string;
  dataBucketKeyArn: string;
  dataBucketDestKeyArn: string;
  dataBucketReplicationRole?: IRole | undefined;
  streamingBucket: CfnBucket;
  streamBucketKeyArn: string;
  streamBucketDestKeyArn: string;
  streamBucketReplicationRole?: IRole | undefined;
}

const getLambdaEntry = (lambdaName: string) => {
  return resolve(__dirname, '..', 'lambdas', lambdaName, 'handler.ts');
};

export class CalabrioQmStack extends Stack {
  public readonly qmBucket: Bucket;
  public readonly dataReplicationRole: IRole;
  public readonly streamReplicationRole: IRole;

  constructor(scope: Construct, id: string, props: CalabrioQmStackProps) {
    super(scope, id, props);

    const transformLambda = new NodejsFunction(this, 'NewlineDelimiterTransformLambda', {
      handler: 'handler',
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(8),
      logRetention: RetentionDays.ONE_MONTH,
      logRetentionRetryOptions: { maxRetries: 10 },
      memorySize: 1024,
      entry: getLambdaEntry('newlineDelimiterTransform'),
      functionName: `newlineDelimiterTransform-${props.prefix}`,
      environment: {
        LOG_LEVEL: 'debug',
        ENVIRONMENT: props.stage as string,
        SERVICE_NAME: `newlineDelimiterTransform-${props.prefix}` //should be tags
      }
    });

    props.encryptionKey.grantEncryptDecrypt(transformLambda);

    // Create QM Data Bucket
    const qmBucketName = `cqm-cip-${props.prefix}-bucket`;
    this.qmBucket = new Bucket(this, 'CQMDataBucket', {
      bucketName: qmBucketName,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      serverAccessLogsPrefix: 'access-logs/',
      encryption: BucketEncryption.S3_MANAGED
    });
    this.qmBucket.addLifecycleRule({
      expiration: Duration.days(5 * 365),
      noncurrentVersionExpiration: Duration.days(1),
      enabled: true
    });
    // Client specific tag request
    Tags.of(this.qmBucket).add('data-classification', 'Confidential');

    // Replicate Connect Data Bucket Recordings
    const dataRepRule = new S3BucketReplication(this, 'CQMDataRecordingsReplication', {
      ruleId: `cqm-redacted-recordings-data-sync-${props.stage}`,
      sourceBucket: props.dataBucket,
      filterPrefix: props.dataBucketRecordingsPrefix,
      sourceDecryptKeyArn: props.dataBucketKeyArn,
      destAcct: Stack.of(this).account,
      destBucketName: qmBucketName,
      destEncryptKeyArn: props.dataBucketDestKeyArn,
      // role will be created since prop is undefined
      role: props.dataBucketReplicationRole
    });
    this.dataReplicationRole = dataRepRule.role;

    // Replicate Connect Data Bucket Reports
    new S3BucketReplication(this, 'CQMDataReportsReplication', {
      ruleId: `cqm-reports-data-sync-${props.stage}`,
      sourceBucket: props.dataBucket,
      filterPrefix: props.dataBucketReportsPrefix,
      sourceDecryptKeyArn: props.dataBucketKeyArn,
      destAcct: Stack.of(this).account,
      destBucketName: qmBucketName,
      destEncryptKeyArn: props.dataBucketDestKeyArn,
      // use singleton role from recordings replication
      role: dataRepRule.role
    });

    // Replicate Connect Streaming Bucket
    const streamRepRule = new S3BucketReplication(this, 'CQMStreamingBucketReplication', {
      ruleId: `cqm-cip-connect-streaming-replication-rule-${props.stage}`,
      sourceBucket: props.streamingBucket,
      sourceDecryptKeyArn: props.streamBucketKeyArn,
      destAcct: Stack.of(this).account,
      destBucketName: qmBucketName,
      destEncryptKeyArn: props.streamBucketDestKeyArn,
      role: props.streamBucketReplicationRole
    });
    this.streamReplicationRole = streamRepRule.role;

    //Both CTR and ATR streams are new line delineated, this are processed and delivered to
    //vf streaming bucket. A manually created replication rule from the streaming bucket copies
    //only the CTR records to the QM bucket.
    this.buildDeliveryStream(props.prefix, 'CTR', props.ctrStream, this.qmBucket, props.encryptionKey, transformLambda);
    this.buildDeliveryStream(props.prefix, 'ATR', props.atrStream, this.qmBucket, props.encryptionKey, transformLambda);

    // Create IAM User and Policy for the Calabrio QM Service
    // Permissions required are described in Calabrio Integration Guide
    const cqmUserPolicy = new Policy(this, 'cqmUserPolicy', {
      statements: [
        // allow access to the kinesis ATR stream
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['kinesis:GetShardIterator', 'kinesis:GetRecords', 'kinesis:DescribeStream'],
          resources: [props.atrStream.streamArn]
        }),
        // allow access to the Calabrio QM S3 bucket
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:ListBucket', 's3:GetBucketLocation'],
          resources: [this.qmBucket.bucketArn]
        }),
        // allow access to the Calabrio QM S3 bucket objects
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
          resources: [`${this.qmBucket.bucketArn}/*`]
        }),
        // allow access to the Encryption Key created by connect stack
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:DescribeKey'],
          resources: [props.encryptionKey.keyArn]
        })
      ]
    });

    const cqmServiceUser = new User(this, 'cqmServiceUser', {
      userName: `${props.prefix}-cqm-service-user`
    });
    cqmServiceUser.attachInlinePolicy(cqmUserPolicy);

    new CfnOutput(this, 'QMBucketName', {
      description: 'Calabrio QM Data Bucket Name',
      value: this.qmBucket.bucketName
    });
    new CfnOutput(this, 'QMBucketArn', {
      description: 'Calabrio QM Data Bucket Arn',
      value: this.qmBucket.bucketArn
    });
    new CfnOutput(this, 'QMAgentStreamName', {
      description: 'Calabrio QM Agent Event Kinesis Stream Name',
      value: props.atrStream.streamName
    });

    // Client specific tag request
    Tags.of(this.qmBucket).add('data-classification', 'Confidential');

    const ctrProcessorLambda = new NodejsFunction(this, 'CtrProcessorLambda', {
      handler: 'handler',
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(30),
      memorySize: 1024,
      entry: getLambdaEntry('ctrProcessor'),
      environment: {
        CDK_STACK_PREFIX: props.prefix,
        RECORDING_BUCKET_NAME: props.recordingBucket.bucketName
      }
    });

    ctrProcessorLambda.addEventSource(
      new S3EventSource(this.qmBucket, {
        events: [EventType.OBJECT_CREATED],
        filters: [{ prefix: 'original/ctr/' }]
      })
    );
    props.encryptionKey.grantEncryptDecrypt(ctrProcessorLambda);

    this.qmBucket.grantReadWrite(ctrProcessorLambda);

    //MAP tags
    Tags.of(scope).add('map-migrated', 'd-server-02w639x33oia5k');
  }

  buildDeliveryStream(
    prefix: string,
    typeId: 'CTR' | 'ATR',
    stream: Stream,
    bucket: IBucket,
    key: IKey,
    transformLambda: VfNodejsFunction
  ) {
    const type = typeId.toLocaleLowerCase();
    const deliveryStreamName = `${prefix}-${type}-cqm-firehose`;

    const logGroup = new LogGroup(this, `${typeId}CqmLogGroup`, {
      logGroupName: `/aws/firehose/${deliveryStreamName}`,
      retention: RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const deliveryLogStream = new LogStream(this, `${typeId}CqmDeliveryLogStream`, {
      logGroup: logGroup,
      logStreamName: 'CqmDelivery',
      removalPolicy: RemovalPolicy.DESTROY
    });

    const firehoseRole: Role = new Role(this, `Connect${typeId}CqmFirehoseRole`, {
      roleName: deliveryStreamName,
      assumedBy: new ServicePrincipal('firehose.amazonaws.com'),
      inlinePolicies: {
        firehosePolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
              resources: [
                `arn:aws:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:${logGroup.logGroupName}:log-stream:*`
              ]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['kinesis:DescribeStream'],
              resources: [stream.streamArn]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['kms:GenerateDataKey'],
              resources: [key.keyArn]
            })
          ]
        })
      }
    });

    transformLambda.grantInvoke(firehoseRole);
    logGroup.grantWrite(firehoseRole);
    key.grantEncryptDecrypt(firehoseRole);
    bucket.grantReadWrite(firehoseRole);
    stream.grantRead(firehoseRole);

    new CfnDeliveryStream(this, `Connect${typeId}CqmFirehose`, {
      deliveryStreamName,
      deliveryStreamType: 'KinesisStreamAsSource',
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: stream.streamArn,
        roleArn: firehoseRole.roleArn
      },
      extendedS3DestinationConfiguration: {
        bucketArn: bucket.bucketArn,
        bufferingHints: {
          intervalInSeconds: 300,
          sizeInMBs: 5
        },
        cloudWatchLoggingOptions: {
          enabled: true,
          logGroupName: logGroup.logGroupName,
          logStreamName: deliveryLogStream.logStreamName
        },
        prefix: typeId === 'CTR' ? `original/${type}/` : `${type}`,
        errorOutputPrefix: `${type}/errors/`,
        encryptionConfiguration: {
          kmsEncryptionConfig: {
            awskmsKeyArn: key.keyArn
          }
        },
        roleArn: firehoseRole.roleArn,
        processingConfiguration: transformLambda
          ? {
              enabled: true,
              processors: [
                {
                  type: 'Lambda',
                  parameters: [{ parameterName: 'LambdaArn', parameterValue: transformLambda.functionArn }]
                }
              ]
            }
          : undefined
      }
    });
  }
}
