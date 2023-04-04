import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Stack, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseStackProps } from './VfStackProps';

export interface ServiceNowStackProps extends BaseStackProps {
  bucketEncryptionKey: IKey;
}

export class ServiceNowStack extends Stack {
  public readonly lambdaBucket: Bucket;

  constructor(scope: Construct, id: string, props: ServiceNowStackProps) {
    super(scope, id, props);

    const { config, stage, bucketEncryptionKey } = props;

    this.lambdaBucket = new Bucket(this, 'ServiceNowBucket', {
      bucketName: `${config.getPrefix(stage)}-servicenow`,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      serverAccessLogsPrefix: 'access-logs/',
      encryption: BucketEncryption.KMS,
      encryptionKey: bucketEncryptionKey
    });

    //MAP tags
    Tags.of(scope).add('map-migrated', 'd-server-02w639x33oia5k');
  }
}
