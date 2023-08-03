import { Construct } from 'constructs';
import { ConnectDataStorage, ConnectDataStreamingStack } from '@voicefoundry-cloud/cdk-resources';
import { ConnectStack } from '../stacks/ConnectStack';
import { BaseStackProps } from '../stacks/VfStackProps';
import { Duration } from 'aws-cdk-lib';

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
      accessLogs: true,
      retain: true
    });
    this.storageStack.buckets.storage?.addLifecycleRule({
      expiration: Duration.days(5 * 365),
      enabled: true
    });

    this.streamingStack = new ConnectDataStreamingStack(this, 'ConnectDataStreaming', {
      ...props,
      prefix,
      stackName: `${prefix}-streaming`,
      streamDataBucket: this.storageStack.buckets.streaming,
      includeCtrStream: true,
      includeCtrFirehose: true,
      includeAgentStream: true,
      includeAgentFirehose: true,
      connectEncryptionKeyArn: this.storageStack.keys.shared?.keyArn
    });

    this.connectInstanceAlias = connectCore?.instanceAlias ?? prefix;

    this.connectStack = new ConnectStack(this, 'ConnectInstance', {
      ...props,
      description: 'Amazon Connect Instance and associated resources',
      stackName: `${prefix}-connect`,
      storage: this.storageStack,
      streaming: this.streamingStack
    });
  }
}
