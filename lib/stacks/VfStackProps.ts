import { Environment, StackProps } from '@aws-cdk/core';
import { ConnectDataStorageProps, ConnectDataStreamingProps, ConnectInstanceProps } from '@ttec-dig-vf/cdk-resources';
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

export interface ConnectStackProps extends ConnectCoreProps, BaseStackProps {}
