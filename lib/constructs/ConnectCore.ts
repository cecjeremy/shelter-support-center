import { Construct } from 'constructs';
import { ConnectDataStorage, ConnectDataStreamingStack } from '@voicefoundry-cloud/cdk-resources';
import { ConnectStack } from '../stacks/ConnectStack';
import { BaseStackProps, ConnectStackProps } from '../stacks/VfStackProps';

export class ConnectCore extends Construct {
  public readonly storageStack: ConnectDataStorage;
  public readonly streamingStack: ConnectDataStreamingStack;
  public readonly connectStack: ConnectStack;
  public readonly connectInstanceAlias: string;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id);

    const prefix = props.config.getPrefix(props.stage);

    const { connectCore } = props.config.packages;

    this.storageStack = new ConnectDataStorage(this, 'ConnectStorage', {
      ...props,
      prefix,
      stackName: `${prefix}-storage`,
      accessLogs: true
    });

    this.streamingStack = new ConnectDataStreamingStack(this, 'ConnectDataStreaming', {
      ...props,
      prefix,
      streamDataBucket: this.storageStack.buckets.streaming,
      includeCtrStream: true,
      includeCtrFirehose: true,
      includeAgentStream: true,
      includeAgentFirehose: true,
      connectEncryptionKeyArn: this.storageStack.keys.shared?.keyArn
    });

    this.connectInstanceAlias = connectCore?.instanceAlias ?? prefix;
    const connectStackProps: ConnectStackProps = {
      ...props,
      description: 'Amazon Connect Instance and associated resources',
      stackName: `${prefix}-connect`,
      storage: this.storageStack,
      streaming: this.streamingStack
    };
    //  {
    //   ...props,
    //   stackName: `${prefix}-connect`,
    //   instanceAlias: this.connectInstanceAlias,
    //   identityManagementType: connectCore?.identityManagementType ?? 'CONNECT_MANAGED',
    //   inboundCallsEnabled: connectCore?.inboundCallsEnabled ?? true,
    //   outboundCallsEnabled: connectCore?.outboundCallsEnabled ?? true,
    //   agentStream: this.streamingStack.agentStream?.streamArn,
    //   ctrStream: this.streamingStack.ctrStream?.streamArn,
    //   contactFlowLogsEnabled: true,
    //   contactLensEnabled: true,
    //   callRecordingsStorage: {
    //     bucket: this.storageStack.buckets.storage!,
    //     key: this.storageStack.keys.shared,
    //     prefix: `${prefix}-recordings`
    //   },
    //   chatTranscriptsStorage: {
    //     bucket: this.storageStack.buckets.storage!,
    //     key: this.storageStack.keys.shared,
    //     prefix: `${prefix}-transcripts`
    //   },
    //   reportsStorage: {
    //     bucket: this.storageStack.buckets.storage!,
    //     key: this.storageStack.keys.shared,
    //     prefix: `${prefix}-reports`
    //   },
    //   mediaStorage: {
    //     key: this.storageStack.keys.shared!,
    //     prefix: `${prefix}-media`,
    //     retentionPeriodInHours: connectCore?.mediaStorage?.retentionPeriodInHours
    //   }
    // }
    this.connectStack = new ConnectStack(this, 'ConnectInstance', connectStackProps);
  }
}
