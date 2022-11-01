import { MigrationConfig } from '@voicefoundry-cloud/vf-deploy';

export const config: MigrationConfig = {
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
