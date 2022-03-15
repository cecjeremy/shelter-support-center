import { BlockPublicAccess, Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import { IKey } from '@aws-cdk/aws-kms';
import { Construct, Stack } from '@aws-cdk/core';
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
  }
}
