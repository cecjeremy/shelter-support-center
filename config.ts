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
      connectInstanceId: ''
    },
    test: {
      profile: 'shelter-test',
      region: 'us-east-1',
      id: '824188805183',
      approval: true,
      connectInstanceId: ''
    },
    prod: {
      profile: 'shelter-prod',
      region: 'us-east-1',
      id: '110716305825',
      approval: true,
      connectInstanceId: ''
    }
  },
  packages: {
    admin: {
      adminUserEmail: 'jon.spaeth@voicefoundry.com',
      loggingLevel: 'debug',
      retain: false,
      useLayer: true
    },
    connectCore: {}
  },
  getPrefix(stage) {
    return `${this.client}-${this.project}${stage ? `-${stage}` : ''}`;
  }
};
