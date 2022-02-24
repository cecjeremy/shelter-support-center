import { Construct, Stage } from '@aws-cdk/core';
import { AdminStack, AdminStackProps } from '@ttec-dig-vf/vf-connect-admin';
import { ConnectCore } from '../constructs/ConnectCore';
import { ConnectLambdas } from '../stacks/ConnectLambdas';
import { SsoStack } from '../stacks/SsoStack';
import { VfStageProps } from './VfStageProps';

export class VfApplicationStage extends Stage {
  constructor(scope: Construct, id: string, props: VfStageProps) {
    super(scope, id, props);

    const { stage, config } = props;
    const prefix = config.getPrefix(stage);

    new ConnectCore(this, 'ConnectStack', props);

    new SsoStack(this, 'SsoStack', { ...props, prefix, stackName: `${prefix}-sso` });

    new ConnectLambdas(this, 'ConnectLambdasStack', {
      ...props,
      prefix,
      client: config.client,
      loggingLevel: 'debug',
      stackName: `${prefix}-connect-lambdas`
    });

    const adminProps: Omit<AdminStackProps, 'assets'> = {
      stackName: `${props.config.getPrefix(props.stage)}-admin`,
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
      }
    };

    new AdminStack(this, `ConnectAdminStack`, adminProps);
  }
}
