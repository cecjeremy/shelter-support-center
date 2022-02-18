import { Construct, Stack } from '@aws-cdk/core';
import { ConnectProvider, ConnectInstance } from '@ttec-dig-vf/cdk-resources';
import { ConnectStackProps } from './VfStackProps';

export class ConnectStack extends Stack {
  constructor(scope: Construct, id: string, props: ConnectStackProps) {
    super(scope, id, props);

    const prefix = props.config.getPrefix(props.stage);

    const connectProvider = new ConnectProvider(this, 'ConnectProvider', {
      env: props.env,
      prefix
    });

    const { connectCore } = props.config.packages;

    const instance = new ConnectInstance(this, 'ConnectInstance', {
      ...props,
      instanceAlias: props.config.getPrefix(props.stage),
      identityManagementType: connectCore?.identityManagementType ?? 'CONNECT_MANAGED',
      inboundCallsEnabled: connectCore?.inboundCallsEnabled ?? true,
      outboundCallsEnabled: connectCore?.outboundCallsEnabled ?? true,
      connectProvider
    });
    instance.node.addDependency(connectProvider);
  }
}
