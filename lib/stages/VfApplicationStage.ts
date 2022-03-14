import { Construct, Stage } from '@aws-cdk/core';
import { CfnTopic } from '@aws-cdk/aws-sns';
import { AdminStack, AdminStackProps } from '@ttec-dig-vf/vf-connect-admin';
import { ConnectCore } from '../constructs/ConnectCore';
import { ConnectLambdas } from '../stacks/ConnectLambdas';
import { ServiceNowStack } from '../stacks/ServiceNowStack';
import { SsoStack } from '../stacks/SsoStack';
import { VfStageProps } from './VfStageProps';

export class VfApplicationStage extends Stage {
  public readonly connectCore: ConnectCore;
  public readonly ssoStack: SsoStack;
  public readonly connectLambdasStack: ConnectLambdas;
  public readonly serviceNowStack: ServiceNowStack;
  public readonly adminStack: AdminStack;

  constructor(scope: Construct, id: string, props: VfStageProps) {
    super(scope, id, props);

    const { stage, config } = props;
    const prefix = config.getPrefix(stage);

    this.connectCore = new ConnectCore(this, 'ConnectStack', props);

    this.ssoStack = new SsoStack(this, 'SsoStack', { ...props, prefix, stackName: `${prefix}-sso` });

    this.connectLambdasStack = new ConnectLambdas(this, 'ConnectLambdasStack', {
      ...props,
      prefix,
      client: config.client,
      loggingLevel: 'debug',
      stackName: `${prefix}-connect-lambdas`
    });

    this.serviceNowStack = new ServiceNowStack(this, 'ServiceNowStack', {
      ...props,
      stackName: `${prefix}-servicenow`
    });

    this.serviceNowStack.addDependency(this.connectCore.storageStack);

    const adminProps: Omit<AdminStackProps, 'assets'> = {
      stackName: `${prefix}-admin`,
      client: props.config.client,
      stage: props.stage,
      connectInstanceId: props.connectInstanceId,
      loggingLevel: props.config.packages.admin.loggingLevel ?? 'debug',
      adminUserEmail: props.config.packages.admin?.adminUserEmail || 'test@adminemail.com',
      retain: props.config.packages.admin.retain ?? false,
      useLayer: props.config.packages.admin.useLayer ?? true,
      aggregatedAgentMetricsTableName: 'agent-metrics',
      concurrency: 0,
      metricsLambdaTimeout: '',
      features: {
        configSetManagement: true,
        permissionsManagementEnabled: true,
        syncManagementEnabled: true,
        connectUserManagementEnabled: true,
        calendarManagementEnabled: true,
        tenancyEnabled: false,
        flowEngineManagementEnabled: false,
        metricsEnabled: false,
        contactSearchEnabled: false
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

    this.adminStack = new AdminStack(this, `ConnectAdminStack`, adminProps);
  }
}
