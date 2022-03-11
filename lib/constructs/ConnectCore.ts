import { CfnBucket } from '@aws-cdk/aws-s3';
import { Construct } from '@aws-cdk/core';
import { ConnectDataStorage, ConnectDataStreamingStack } from '@ttec-dig-vf/cdk-resources';
import { ConnectStack } from '../stacks/ConnectStack';
import { BaseStackProps } from '../stacks/VfStackProps';

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
      stackName: `${prefix}-storage`
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

    // add access logging to all storage buckets
    Object.keys(this.storageStack.buckets).forEach(key => {
      const bucket = this.storageStack.buckets[key as keyof typeof this.storageStack.buckets];

      if (!bucket) {
        return;
      }

      (bucket.node.defaultChild as CfnBucket).loggingConfiguration = {
        destinationBucketName: bucket.bucketName,
        logFilePrefix: 'access-logs/'
      };
    });

    this.connectInstanceAlias = connectCore?.instanceAlias ?? prefix;

    this.connectStack = new ConnectStack(this, 'ConnectInstance', {
      ...props,
      stackName: `${prefix}-connect`,
      instanceAlias: this.connectInstanceAlias,
      identityManagementType: connectCore?.identityManagementType ?? 'CONNECT_MANAGED',
      inboundCallsEnabled: connectCore?.inboundCallsEnabled ?? true,
      outboundCallsEnabled: connectCore?.outboundCallsEnabled ?? true,
      agentStream: this.streamingStack.agentStream?.streamArn,
      ctrStream: this.streamingStack.ctrStream?.streamArn,
      callRecordingsStorage: {
        bucket: this.storageStack.buckets.storage!,
        key: this.storageStack.keys.shared,
        prefix: `${prefix}-recordings`
      },
      chatTranscriptsStorage: {
        bucket: this.storageStack.buckets.storage!,
        key: this.storageStack.keys.shared,
        prefix: `${prefix}-transcripts`
      },
      reportsStorage: {
        bucket: this.storageStack.buckets.storage!,
        key: this.storageStack.keys.shared,
        prefix: `${prefix}-reports`
      },
      mediaStorage: {
        key: this.storageStack.keys.shared!,
        prefix: `${prefix}-media`,
        retentionPeriodInHours: connectCore?.mediaStorage?.retentionPeriodInHours
      }
    });
  }
}
