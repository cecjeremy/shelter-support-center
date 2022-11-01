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
    }
    // test: {
    //   profile: 'shelter-test',
    //   region: 'us-east-1',
    //   id: '824188805183',
    //   connectInstanceId: '833b6bf1-0b04-4494-a03e-8924081ca422'
    // },
    // prod: {
    //   profile: 'shelter-prod',
    //   region: 'us-east-1',
    //   id: '110716305825',
    //   approval: true,
    //   connectInstanceId: 'c2ec5e7f-d5b4-49e3-8b99-44359dd1ee9d'
    // }
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
      name: 'dev',
      account: '564741965342',
      region: 'us-east-1',
      profile: 'shelter-dev',
      connectInstanceAlias: 'shelter-life-dev',
      ompTableName: 'shelter-support-center-admin-dev-admin-table', //!needs verification
      allowedActions: ['extract', 'publish'],
      phoneNumbers: {
        '+15126612358': 'did1-test', //!needs verification
        '+15126612374': 'did2-test' //!needs verification
      }
    },
    {
      name: 'test',
      account: '824188805183',
      region: 'us-east-1',
      profile: 'shelter-test',
      connectInstanceAlias: 'shelter-support-center-test',
      ompTableName: 'shelter-support-center-admin-test-admin-table', //!needs verification
      allowedActions: ['extract', 'publish']
    }
  ],
  resources: {
    connect: {
      HoursOfOperation: {
        extract: { enabled: true, filter: { exclude: ['^zzz.+'] } },
        publish: { enabled: true }
      },
      Prompt: { extract: { enabled: true, filter: { exclude: ['^zzz.+'] } }, publish: { enabled: true } },
      SecurityProfile: { extract: { enabled: true }, publish: { enabled: true } },
      AgentStatus: {
        extract: { enabled: true, filter: { exclude: ['Available', 'Offline'] } },
        publish: { enabled: true }
      },
      ContactFlowModule: {
        extract: { enabled: true, filter: { exclude: ['^zzz.+'] } },
        publish: { enabled: true }
      },
      ContactFlow: {
        extract: { enabled: true, filter: { exclude: ['^zzz.+'] } },
        publish: { enabled: true }
      },
      Queue: {
        extract: { enabled: true, filter: { exclude: ['^zzz.+'] } },
        publish: { enabled: false }
      },
      UserHierarchy: { extract: { enabled: true }, publish: { enabled: true }, delete: { enabled: true } },
      User: { extract: { enabled: true }, publish: { enabled: true }, delete: { enabled: true } },
      QuickConnect: {
        extract: { enabled: true, filter: { exclude: ['^zzz.+'] } },
        publish: { enabled: false }
      },
      RoutingProfile: {
        extract: { enabled: true, filter: { exclude: ['^zzz.+'] } },
        publish: { enabled: true }
      }
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
