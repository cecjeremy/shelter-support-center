import { ConnectCoreProps } from './lib/stacks/VfStackProps';

export interface Account {
  /** AWS profile to use for the account */
  profile: string;
  /** AWS region for account deployment */
  region: string;
  /** AWS account id */
  id: string;
  /** Connect Instance Id */
  connectInstanceId: string;
  /** Requires approval */
  approval?: boolean;
}

export interface Configuration {
  client: string;
  project: string;
  cicd: Omit<Account, 'approval' | 'connectInstanceId'>;
  accounts: {
    [key: string]: Account;
  };
  packages: {
    connectCore?: ConnectCoreProps;
    admin: {
      adminUserEmail: string;
      loggingLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
      retain?: boolean;
      useLayer?: boolean;
    };
  };
  getPrefix(stage?: string): string;
}

export const config: Configuration = {
  client: 'shelter',
  project: 'support-center',
  cicd: {
    profile: 'shelter-dev',
    region: 'us-east-1',
    id: '564741965342'
  },
  accounts: {
    dev: {
      profile: 'shelter-dev',
      region: 'us-east-1',
      id: '564741965342',
      connectInstanceId: 'e2391d8c-3f63-431d-bb9c-53a8c4a0838a'
    },
    test: {
      profile: 'shelter-test',
      region: 'us-east-1',
      id: '824188805183',
      connectInstanceId: '833b6bf1-0b04-4494-a03e-8924081ca422'
    },
    prod: {
      profile: 'shelter-prod',
      region: 'us-east-1',
      id: '110716305825',
      approval: true,
      connectInstanceId: 'c2ec5e7f-d5b4-49e3-8b99-44359dd1ee9d'
    }
  },
  packages: {
    admin: {
      adminUserEmail: 'jon.spaeth@voicefoundry.com',
      loggingLevel: 'debug',
      retain: false,
      useLayer: true
    },
    connectCore: {
      identityManagementType: 'SAML'
    }
  },
  getPrefix(stage) {
    return `${this.client}-${this.project}${stage ? `-${stage}` : ''}`;
  }
};
