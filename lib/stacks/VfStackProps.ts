import { Environment, StackProps } from 'aws-cdk-lib';
import {
  ConnectDataStorage,
  ConnectDataStorageProps,
  ConnectDataStreamingProps,
  ConnectDataStreamingStack,
  ConnectInstanceProps
} from '@voicefoundry-cloud/cdk-resources';
import { Configuration } from '../../config';

export interface BaseStackProps extends StackProps {
  env: Required<Environment>;
  config: Required<Configuration>;
  stage: Required<string>;
}

export interface ConnectCoreProps
  extends Partial<ConnectInstanceProps>,
    Omit<ConnectDataStorageProps, 'client' | 'stage' | 'project' | 'env' | 'prefix'>,
    Omit<ConnectDataStreamingProps, 'client' | 'stage' | 'project' | 'env' | 'prefix'> {}

// export interface ConnectStackProps extends ConnectCoreProps, BaseStackProps {}
export interface ConnectStackProps extends BaseStackProps {
  storage: ConnectDataStorage;
  streaming: ConnectDataStreamingStack;
}
