import { BlockPublicAccess, Bucket } from '@aws-cdk/aws-s3';
import { Construct, Stack } from '@aws-cdk/core';
import { BaseStackProps } from './VfStackProps';

export class ServiceNowStack extends Stack {
  public readonly lambdaBucket: Bucket;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const { config, stage } = props;

    this.lambdaBucket = new Bucket(this, 'ServiceNowBucket', {
      bucketName: `${config.getPrefix(stage)}-servicenow`,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      serverAccessLogsPrefix: 'access-logs/'
    });
  }
}
