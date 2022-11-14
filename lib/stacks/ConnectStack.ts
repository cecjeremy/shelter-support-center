import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ConnectProvider, ConnectInstance } from '@voicefoundry-cloud/cdk-resources';
import { ConnectStackProps } from './VfStackProps';

export class ConnectStack extends Stack {
  constructor(scope: Construct, id: string, props: ConnectStackProps) {
    super(scope, id, props);

    const prefix = props.config.getPrefix(props.stage);

    const connectProvider = new ConnectProvider(this, {
      env: props.env,
      prefix
    });

    const { connectCore } = props.config.packages;

    props.storage.bu;

    const instance = new ConnectInstance(this, 'ConnectInstance', {
      ...props,
      instanceAlias: props.config.getPrefix(props.stage),
      identityManagementType: connectCore?.identityManagementType ?? 'CONNECT_MANAGED',
      inboundCallsEnabled: connectCore?.inboundCallsEnabled ?? true,
      outboundCallsEnabled: connectCore?.outboundCallsEnabled ?? true,
      connectProvider,
      agentStream: props.streaming.agentStream,
      ctrStream: props.streaming.ctrStream,
      callRecordingsStorage: {
        bucket: props.storage.buckets.storage!,
        key: prop.storage.keys.shared,
        prefix: props.storage
      }
    });
    instance.node.addDependency(connectProvider);
  }
}
