import { Construct } from 'constructs';
import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { S3BucketReplication } from '../constructs/S3BucketReplication';
import { CfnBucket } from 'aws-cdk-lib/aws-s3';
import { Role } from 'aws-cdk-lib/aws-iam';

export interface DAReplicationStackProps extends StackProps {
  stage: Required<string>;
  dataBucket: CfnBucket;
  dataBucketRecordingsPrefix: string;
  dataBucketReportsPrefix: string;
  dataBucketKeyArn: string;
  dataBucketDestAcct: string;
  dataBucketDestinationBucket: string;
  dataBucketDestKeyArn: string;
  streamBucket: CfnBucket;
  streamBucketKeyArn: string;
  streamBucketDestAcct: string;
  streamBucketDestinationBucket: string;
  streamBucketDestKeyArn: string;
}

export class DaReplicationStack extends Stack {
  constructor(scope: Construct, id: string, props: DAReplicationStackProps) {
    super(scope, id, props);

    const dataReplicationRole = Role.fromRoleName(
      this,
      'DaDataReplicationRole',
      `${props.dataBucket.bucketName}-replication-role`
    );
    const streamingReplicationRole = Role.fromRoleName(
      this,
      'DaStreamingReplicationRole',
      `${props.streamBucket.bucketName}-replication-role`
    );

    // Replicate Connect Data Bucket Recording to Data Analytics
    new S3BucketReplication(this, 'DataRecordingsReplication', {
      ruleId: `data-analytics-connect-recordings-sync-${props.stage}`,
      sourceBucket: props.dataBucket,
      filterPrefix: props.dataBucketRecordingsPrefix,
      sourceDecryptKeyArn: props.dataBucketKeyArn,
      destAcct: props.dataBucketDestAcct,
      destBucketName: props.dataBucketDestinationBucket,
      destEncryptKeyArn: props.dataBucketDestKeyArn,
      role: dataReplicationRole
    });

    // Replicate Connect Data Bucket Reports to Data Analytics
    new S3BucketReplication(this, 'DataReportsReplication', {
      ruleId: `data-analytics-connect-reports-sync-${props.stage}`,
      sourceBucket: props.dataBucket,
      filterPrefix: props.dataBucketReportsPrefix,
      sourceDecryptKeyArn: props.dataBucketKeyArn,
      destAcct: props.dataBucketDestAcct,
      destBucketName: props.dataBucketDestinationBucket,
      destEncryptKeyArn: props.dataBucketDestKeyArn,
      role: dataReplicationRole
    });

    // Streaming Bucket Replication
    new S3BucketReplication(this, 'StreamingBucketReplication', {
      ruleId: `data-analytics-connect-streaming-replication-rule-${props.stage}`,
      sourceBucket: props.streamBucket,
      sourceDecryptKeyArn: props.streamBucketKeyArn,
      destAcct: props.streamBucketDestAcct,
      destBucketName: props.streamBucketDestinationBucket,
      destEncryptKeyArn: props.streamBucketDestKeyArn,
      role: streamingReplicationRole
    });

    //MAP tags
    Tags.of(scope).add('map-migrated', 'd-server-02w639x33oia5k');
  }
}
