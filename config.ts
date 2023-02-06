import { ConnectCoreProps } from './lib/stacks/VfStackProps';
import { MigrationConfig } from '@voicefoundry-cloud/vf-deploy';

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
      approval: true,
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

export const migrationConfig: MigrationConfig = {
  environments: [
    {
      account: '564741965342',
      region: 'us-east-1',
      profile: 'shelter-dev',
      name: 'dev',
      connectInstanceAlias: 'shelter-support-center-dev',
      ompTableName: 'shelter-connect-admin-dev-admin-table',
      allowedActions: ['extract', 'publish'],
      phoneNumbers: {
        '+13467662440': 'main-inbound',
        '+14044249754': 'secondary-inbound'
      }
    },
    {
      account: '824188805183',
      region: 'us-east-1',
      profile: 'shelter-test',
      name: 'test',
      connectInstanceAlias: 'shelter-support-center-test',
      ompTableName: 'shelter-connect-admin-test-admin-table',
      allowedActions: ['extract', 'publish'],
      phoneNumbers: {
        '+12135241781': 'main-inbound',
        '+14158395301': 'secondary-inbound'
      }
    },
    {
      account: '110716305825',
      region: 'us-east-1',
      profile: 'shelter-prod',
      name: 'prod',
      connectInstanceAlias: 'shelter-support-center-prod',
      ompTableName: 'shelter-connect-admin-prod-admin-table',
      allowedActions: ['extract', 'publish'],
      phoneNumbers: {
        '+12816525081': 'main-inbound',
        '+13239246181': 'secondary-inbound'
      }
    }
  ],
  resources: {
    connect: {
      ContactFlow: {
        extract: { enabled: true, filter: { include: ['SC.+', 'AmShield.+'] } },
        publish: { enabled: true }
      },
      AgentStatus: {
        extract: { enabled: true, filter: { exclude: ['Available', 'Offline'] } },
        publish: { enabled: true }
      },
      ContactFlowModule: {
        extract: { enabled: true, filter: { include: ['SC.+'] } },
        publish: { enabled: true }
      },
      Queue: {
        extract: { enabled: true, filter: { include: ['SC.+', 'AmShield.+'] } },
        publish: { enabled: true }
      },
      HoursOfOperation: { extract: { enabled: false } },
      Prompt: { extract: { enabled: false } },
      QuickConnect: { extract: { enabled: true }, publish: { enabled: true }, delete: { enabled: true } },
      RoutingProfile: {
        extract: { enabled: true, filter: { include: ['SC.+'] } },
        publish: { enabled: true }
      },
      SecurityProfile: { extract: { enabled: false } },
      User: { extract: { enabled: true }, publish: { enabled: true }, delete: { enabled: true } },
      UserHierarchy: { extract: { enabled: true }, publish: { enabled: true }, delete: { enabled: true } }
    },
    omp: {
      OmpAttributes: { extract: { enabled: true }, publish: { enabled: true } },
      OmpClosures: { extract: { enabled: true }, publish: { enabled: true } },
      OmpHolidays: { extract: { enabled: true }, publish: { enabled: true } },
      OmpHours: { extract: { enabled: true }, publish: { enabled: true } },
      OmpPrompts: { extract: { enabled: true }, publish: { enabled: true } }
    }
  }
};
