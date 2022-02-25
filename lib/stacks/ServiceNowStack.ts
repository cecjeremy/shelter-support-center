import { Bucket } from '@aws-cdk/aws-s3';
import { Construct, RemovalPolicy, Stack } from '@aws-cdk/core';
import { CfnInclude } from '@aws-cdk/cloudformation-include';
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment';
import { StringParameter } from '@aws-cdk/aws-ssm';
import { BaseStackProps } from './VfStackProps';
import path from 'path';
import { existsSync } from 'fs';

export interface ServiceNowStackProps extends BaseStackProps {
  callRecordingBucket: string;
}

type SsmParam = {
  path: string;
  description: string;
  version: number;
};

export class ServiceNowStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceNowStackProps) {
    super(scope, id, props);

    const { config, stage, callRecordingBucket } = props;

    const bucket = new Bucket(this, 'ServiceNowBucket', {
      bucketName: `${config.getPrefix(stage)}-servicenow`,
      versioned: true,
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY
    });

    if (existsSync(path.resolve(__dirname, `../servicenow/${stage}`))) {
      new BucketDeployment(this, 'DeployLambda', {
        destinationBucket: bucket,
        sources: [Source.asset(path.resolve(__dirname, `../servicenow/${stage}/lambda.zip`))]
      });

      new CfnInclude(this, 'ServiceNowCfnStack', {
        templateFile: path.resolve(__dirname, `../servicenow/${stage}/template.json`),
        preserveLogicalIds: false,
        parameters: {
          LambdaS3BucketName: bucket.bucketName,
          LambdaFileKey: 'lambda.zip',
          CallRecordingBucketName: callRecordingBucket
        }
      }).node.addDependency(bucket);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ssmParams: { params: SsmParam[] } = require(`../servicenow/${stage}/ssm-params.json`);

      ssmParams.params.forEach((param, idx) => {
        StringParameter.fromSecureStringParameterAttributes(this, `ServiceNowParam${idx}`, {
          parameterName: param.path,
          version: param.version
        });
      });
    }
  }
}
