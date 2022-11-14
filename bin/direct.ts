import { App } from 'aws-cdk-lib';
import { config } from '../config';
import { VfApplicationStage } from '../lib/stages/VfApplicationStage';

/**
 * Use this code to bypass pipeline
 */

const app = new App();

const stage = 'dev';
const { id, region, connectInstanceId } = config.accounts[stage];

new VfApplicationStage(app, {
  env: { account: id, region },
  config,
  stage,
  connectInstanceId
});
