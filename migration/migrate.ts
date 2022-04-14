#!ts-node
import { CLI, CLIBuilder, EnvironmentNameTransformer, INameTransformer } from '@ttec-dig-vf/vf-deploy';
import { config } from './config';

// Builder class to support customization.
export class Builder implements CLIBuilder {
  getNameTransformer(): INameTransformer {
    return new EnvironmentNameTransformer();
  }
}

// Executes the actual command-line interface for the deploy manager framework.
new CLI(new Builder(), config).exec();
