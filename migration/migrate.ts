#!ts-node
import {
  CLI,
  CLIBuilder,
  DefaultNameTransformer,
  DeployableNameProps,
  DeployEnvironment,
  INameTransformer,
  StorableNameProps
} from '@ttec-dig-vf/vf-deploy';

export class ApplicationNameTransformer extends DefaultNameTransformer {
  public getStorableName = <T extends StorableNameProps>(props: T): string => {
    if (props.transformType !== 'Lambda') {
      return props.deployedName;
    }

    if (props.deployedName.includes('getConfig')) {
      return 'getConfig-shelter-connect-admin';
    }
    if (props.deployedName.includes('openCheck')) {
      return 'openCheck-shelter-connect-admin';
    }
    if (props.deployedName.includes('secondsToMinutesConverter')) {
      return 'secondsToMinutesConverter-shelter-support-center';
    }

    return props.deployedName;
  };

  public getDeployableName = <T extends DeployableNameProps>(props: T): string => {
    if (props.transformType !== 'Lambda') {
      return props.storableName;
    }

    switch (props.deployEnvironment) {
      case DeployEnvironment.Development:
        return `${props.storableName}-dev`;
      case DeployEnvironment.Test:
        return `${props.storableName}-test`;
      case DeployEnvironment.Production:
        return `${props.storableName}-prod`;
      default:
        return props.storableName;
    }
  };
}

// Builder class to support customization.
export class Builder implements CLIBuilder {
  getNameTransformer(): INameTransformer {
    return new ApplicationNameTransformer();
  }
}

// Executes the actual command-line interface for the deploy manager framework.
CLI.exec(new Builder());
