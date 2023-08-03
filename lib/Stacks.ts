import { App, Environment, Fn, Stage, StageProps, Tags } from 'aws-cdk-lib';
import { OmpStack, OmpStackProps } from '@voicefoundry-cloud/vf-omp';
import { ConnectCore } from './constructs/ConnectCore';
import { ConnectLambdas } from './stacks/ConnectLambdas';
import { ServiceNowStack } from './stacks/ServiceNowStack';
import { SsoStack } from './stacks/SsoStack';
import { CalabrioQmStack } from './stacks/CalabrioQmStack';
import { DaReplicationStack } from './stacks/DaReplicationStack';
import { Configuration } from '../config';
import { CfnBucket } from 'aws-cdk-lib/aws-s3';

export interface StacksProps extends StageProps {
  env: Required<Environment>;
  stage: Required<string>;
  connectInstanceId: Required<string>;
  config: Configuration;
}

/**
 * Defines the stacks used by the application.
 * NOTE: this is not a construct, it adds the related stacks to a CDK App, or Pipeline Stage
 *   This allows us to diff/synth/test the app without the pipeline by using bin/direct.ts
 */

export class Stacks {
  public readonly connectCore: ConnectCore;
  public readonly ssoStack: SsoStack;
  public readonly connectLambdasStack: ConnectLambdas;
  public readonly serviceNowStack: ServiceNowStack;
  public readonly adminStack: OmpStack;
  public readonly calabrioQmStack: CalabrioQmStack;
  public readonly daReplicationStack: DaReplicationStack;

  constructor(private readonly scope: Stage | App, props: StacksProps) {
    const { stage, config } = props;
    const prefix = config.getPrefix(stage);

    this.connectCore = new ConnectCore(this.scope, 'ConnectStack', props);

    this.ssoStack = new SsoStack(this.scope, 'SsoStack', { ...props, prefix, stackName: `${prefix}-sso` });

    this.connectLambdasStack = new ConnectLambdas(this.scope, 'ConnectLambdasStack', {
      ...props,
      prefix,
      client: config.client,
      loggingLevel: 'debug',
      stackName: `${prefix}-connect-lambdas`
    });

    this.serviceNowStack = new ServiceNowStack(this.scope, 'ServiceNowStack', {
      ...props,
      stackName: `${prefix}-servicenow`,
      bucketEncryptionKey: this.connectCore.storageStack.keys.shared!
    });

    const adminProps: Omit<OmpStackProps, 'assets'> = {
      env: props.env,
      stackName: `${prefix}-admin`,
      client: props.config.client,
      stage: props.stage,
      connectInstanceId: props.connectInstanceId,
      loggingLevel: props.config.packages.admin.loggingLevel ?? 'debug',
      adminUserEmail: props.config.packages.admin?.adminUserEmail || 'test@adminemail.com',
      retain: props.config.packages.admin.retain ?? false,
      useLayer: props.config.packages.admin.useLayer ?? true,
      features: {
        configSetManagement: true,
        permissionsManagementEnabled: true,
        syncManagementEnabled: true,
        connectUserManagementEnabled: true,
        calendarManagementEnabled: true,
        tenancyEnabled: false,
        phoneNumberTaxonomyEnabled: true
      },
      hosting: {
        s3SecureTransport: true,
        enableCloudfrontLogs: true,
        loggingBucketName: this.connectCore.storageStack.buckets.accessLogs?.bucketName
      },
      appEventsSnsTopic: {
        masterKey: this.connectCore.storageStack.keys.shared
      }
    };

    this.adminStack = new OmpStack(this.scope, `ConnectAdminStack`, adminProps);

    this.adminStack.addDependency(this.connectCore.connectStack);

    this.calabrioQmStack = new CalabrioQmStack(this.scope, 'CalabrioQmStack', {
      env: props.env,
      stackName: `${prefix}-calabrio-qm`,
      prefix,
      stage,
      ctrStream: this.connectCore.streamingStack.ctrStream!,
      atrStream: this.connectCore.streamingStack.agentStream!,
      encryptionKey: this.connectCore.storageStack.keys.shared!,
      recordingBucket: this.connectCore.storageStack.buckets.storage!
    });

    this.daReplicationStack = new DaReplicationStack(this.scope, 'DaReplicationStack', {
      stage: props.stage,
      stackName: `${prefix}-da-replication`,
      dataBucket: this.connectCore.storageStack.buckets.storage!.node.defaultChild as CfnBucket,
      dataBucketPrefix: 'Analysis/Voice/Redacted/',
      dataBucketKeyArn: Fn.importValue(`${prefix}:ConnectSharedKeyId`),
      dataBucketDestAcct: props.config.packages.shelterAnalytics[props.stage].account,
      dataBucketDestinationBucket: props.config.packages.shelterAnalytics[props.stage].dataBucket,
      dataBucketDestKeyArn: props.config.packages.shelterAnalytics[props.stage].dataBucketEncryptKey,
      streamBucket: this.connectCore.streamingStack.streamDataBucket.node.defaultChild as CfnBucket,
      streamBucketPrefix: '/',
      streamBucketKeyArn: Fn.importValue(`${prefix}:ConnectSharedKeyId`),
      streamBucketDestAcct: props.config.packages.shelterAnalytics[props.stage].account,
      streamBucketDestinationBucket: props.config.packages.shelterAnalytics[props.stage].streamingBucket,
      streamBucketDestKeyArn: props.config.packages.shelterAnalytics[props.stage].streamingBucketEncryptKey
    });

    //MAP tags
    Tags.of(scope).add('map-migrated', 'd-server-02w639x33oia5k');
  }
}
