import { Construct, Stage } from '@aws-cdk/core';
import { ConnectCore } from '../constructs/ConnectCore';
import { VfStageProps } from './VfStageProps';

export class ConnectCoreStage extends Stage {
  constructor(scope: Construct, id: string, props: VfStageProps) {
    super(scope, id, props);
    new ConnectCore(this, 'ConnectStack', props);
  }
}
