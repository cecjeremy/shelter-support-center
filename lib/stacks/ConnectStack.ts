import { Stack, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  ConnectInstance,
  ConnectDataStorage,
  ConnectDataStreamingStack,
  LegacyConnectProvider
} from '@voicefoundry-cloud/cdk-resources';
import { BaseStackProps } from './VfStackProps';
export interface ConnectStackProps extends BaseStackProps {
  storage: ConnectDataStorage;
  streaming: ConnectDataStreamingStack;
}
export class ConnectStack extends Stack {
  constructor(scope: Construct, id: string, props: ConnectStackProps) {
    super(scope, id, props);

    const prefix = props.config.getPrefix(props.stage);

    const connectProvider = new LegacyConnectProvider(this, {
      prefix
    });

    const { connectCore } = props.config.packages;

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
        key: props.storage.keys.shared,
        prefix: `${prefix}-recordings`
      },
      chatTranscriptsStorage: {
        bucket: props.storage.buckets.storage!,
        key: props.storage.keys.shared,
        prefix: `${prefix}-transcripts`
      },
      reportsStorage: {
        bucket: props.storage.buckets.storage!,
        key: props.storage.keys.shared,
        prefix: `${prefix}-reports`
      },
      mediaStorage: {
        key: props.storage.keys.shared!,
        prefix: `${prefix}-media`
      },
      contactFlowLogsEnabled: true,
      contactLensEnabled: true
    });
    instance.node.addDependency(connectProvider);

    //MAP tags
    Tags.of(scope).add('map-migrated', 'd-server-02w639x33oia5k');
  }
}
