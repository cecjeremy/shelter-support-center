import { Environment, StageProps } from 'aws-cdk-lib';
import { Configuration } from '../../config';

export interface VfStageProps extends StageProps {
  env: Required<Environment>;
  stage: Required<string>;
  connectInstanceId: Required<string>;
  config: Configuration;
}
