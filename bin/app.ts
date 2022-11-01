import { App } from 'aws-cdk-lib';
import { PipelineStack } from '../lib/stacks/PipelineStack';
import { config } from '../config';

const app = new App();

new PipelineStack(app, 'PipelineStack', {
  stackName: `${config.getPrefix()}-cicd`,
  description: 'VF Main CICD Pipeline Stack',
  env: { account: config.cicd.id, region: config.cicd.region }
});
