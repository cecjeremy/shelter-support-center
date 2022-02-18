import { Construct, Stage } from '@aws-cdk/core';
import { AdminStack, AdminStackProps } from '@ttec-dig-vf/vf-connect-admin';
import { VfStageProps } from './VfStageProps';

export class AdminAppStage extends Stage {
  constructor(scope: Construct, id: string, props: VfStageProps) {
    super(scope, id, props);

    const adminProps: Omit<AdminStackProps, 'assets'> = {
      ...props.config,
      stage: props.stage,
      connectInstanceId: props.connectInstanceId,
      loggingLevel: props.config.packages.admin.loggingLevel ?? 'debug',
      adminUserEmail: props.config.packages.admin?.adminUserEmail || 'test@adminemail.com',
      retain: props.config.packages.admin.retain ?? false,
      useLayer: props.config.packages.admin.useLayer ?? true
    };

    new AdminStack(this, `connect-admin`, adminProps);
  }
}
