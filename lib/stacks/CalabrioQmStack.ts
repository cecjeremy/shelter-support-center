import { Aws, Duration, RemovalPolicy, Stack, StackProps, Tags, CfnOutput } from 'aws-cdk-lib';
import { Effect, PolicyDocument, PolicyStatement, Role, Policy, User, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { CfnDeliveryStream } from 'aws-cdk-lib/aws-kinesisfirehose';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { VfNodejsFunction } from '@voicefoundry-cloud/cdk-resources';
import { LogGroup, LogStream, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket, BlockPublicAccess, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { resolve } from 'path';

export interface CalabrioQmStackProps extends StackProps {
  prefix: string;
  stage: string;
  ctrStream: Stream;
  atrStream: Stream;
  encryptionKey: Key;
}

const getLambdaEntry = (lambdaName: string) => {
  return resolve(__dirname, '..', 'lambdas', lambdaName, 'handler.ts');
};

export class CalabrioQmStack extends Stack {
  public readonly qmBucket: Bucket;
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
        SERVICE_NAME: `newlineDelimiterTransform-${props.prefix}`
      }
    });

    props.encryptionKey.grantEncryptDecrypt(transformLambda);

    // Create QM Data Bucket
    this.qmBucket = new Bucket(this, 'CQMDataBucket', {
      bucketName: `cqm-cip-${props.prefix}-bucket`,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      serverAccessLogsPrefix: 'access-logs/',
      encryption: BucketEncryption.S3_MANAGED
    });

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
      description: 'Calabrio QM ATR Kinesis Stream Name',
      value: props.atrStream.streamName
    });

    // Client specific tag request
    Tags.of(this.qmBucket).add('data-classification', 'Confidential');
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
        prefix: `${type}/`,
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
