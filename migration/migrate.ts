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

export class DevNameTransformer extends DefaultNameTransformer {
  public getStorableName = <T extends StorableNameProps>(props: T): string => {
    if (props.transformType !== 'Lambda') {
      return props.deployedName;
    }

    if (props.deployedName.includes('getConfig')) {
      return 'getConfig';
    }
    if (props.deployedName.includes('openCheck')) {
      return 'openCheck';
    }
    if (props.deployedName.includes('secondsToMinutesConverter')) {
      return 'secondsToMinutesConverter';
    }

    return props.deployedName;
  };

  public getDeployableName = <T extends DeployableNameProps>(props: T): string => {
    if (props.transformType !== 'Lambda') {
      return props.storableName;
    }

    switch (props.deployEnvironment) {
      case DeployEnvironment.Development:
        return `${props.storableName}-shelter-connect-admin-dev`;
      case DeployEnvironment.Test:
        return `${props.storableName}-shelter-connect-admin-test`;
      case DeployEnvironment.Production:
        return `${props.storableName}-shelter-connect-admin-prod`;
      default:
        return props.storableName;
    }
  };
}

// Builder class to support customization.
export class Builder implements CLIBuilder {
  getNameTransformer(): INameTransformer {
    return new DevNameTransformer();
  }
}

// Executes the actual command-line interface for the deploy manager framework.
CLI.exec(new Builder());
