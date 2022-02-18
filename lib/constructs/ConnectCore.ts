import { Construct } from '@aws-cdk/core';
import { ConnectDataStorage, ConnectDataStreamingStack } from '@ttec-dig-vf/cdk-resources';
import { ConnectStack } from '../stacks/ConnectStack';
import { BaseStackProps } from '../stacks/VfStackProps';

export class ConnectCore extends Construct {
  public readonly connectInstanceAlias: string;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id);

    const prefix = props.config.getPrefix(props.stage);

    const { connectCore } = props.config.packages;

    const storage = new ConnectDataStorage(this, 'ConnectStorage', {
      ...props,
      prefix,
      stackName: `${prefix}-storage`
    });

    const streaming = new ConnectDataStreamingStack(this, 'ConnectDataStreaming', {
      ...props,
      prefix,
      stackName: `${prefix}-streaming`,
      streamDataBucket: storage.buckets.streaming
    });

    this.connectInstanceAlias = connectCore?.instanceAlias ?? prefix;

    new ConnectStack(this, 'ConnectInstance', {
      ...props,
      stackName: `${prefix}-connect`,
      instanceAlias: this.connectInstanceAlias,
      identityManagementType: connectCore?.identityManagementType ?? 'CONNECT_MANAGED',
      inboundCallsEnabled: connectCore?.inboundCallsEnabled ?? true,
      outboundCallsEnabled: connectCore?.outboundCallsEnabled ?? true,
      agentStream: streaming.agentStream?.streamArn,
      ctrStream: streaming.ctrStream?.streamArn,
      callRecordingsStorage: {
        bucket: storage.buckets.storage!,
        key: storage.keys.shared,
        prefix: `${prefix}-recordings`
      },
      chatTranscriptsStorage: {
        bucket: storage.buckets.storage!,
        key: storage.keys.shared,
        prefix: `${prefix}-transcripts`
      },
      reportsStorage: {
        bucket: storage.buckets.storage!,
        key: storage.keys.shared,
        prefix: `${prefix}-reports`
      },
      mediaStorage: {
        key: storage.keys.shared!,
        prefix: `${prefix}-media`,
        retentionPeriodInHours: connectCore?.mediaStorage?.retentionPeriodInHours
      }
    });
  }
}
