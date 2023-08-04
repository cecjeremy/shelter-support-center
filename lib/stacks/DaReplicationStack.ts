import { Construct } from 'constructs';
import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { S3BucketReplication } from '../constructs/S3BucketReplication';
import { CfnBucket } from 'aws-cdk-lib/aws-s3';

export interface DAReplicationStackProps extends StackProps {
  stage: Required<string>;
  dataBucket: CfnBucket;
  dataBucketPrefix: string;
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

    // Data Bucket Replication to Data Analytics
    new S3BucketReplication(this, 'DataBucketReplication', {
      ruleId: `data-analytics-connect-data-replication-rule-${props.stage}`,
      sourceBucket: props.dataBucket,
      filterPrefix: props.dataBucketPrefix,
      sourceDecryptKeyArn: props.dataBucketKeyArn,
      destAcct: props.dataBucketDestAcct,
      destBucketName: props.dataBucketDestinationBucket,
      destEncryptKeyArn: props.dataBucketDestKeyArn
    });

    // Streaming Bucket Replication
    new S3BucketReplication(this, 'StreamingBucketReplication', {
      ruleId: `data-analytics-connect-streaming-replication-rule-${props.stage}`,
      sourceBucket: props.streamBucket,
      sourceDecryptKeyArn: props.streamBucketKeyArn,
      destAcct: props.streamBucketDestAcct,
      destBucketName: props.streamBucketDestinationBucket,
      destEncryptKeyArn: props.streamBucketDestKeyArn
    });

    //MAP tags
    Tags.of(scope).add('map-migrated', 'd-server-02w639x33oia5k');
  }
}
