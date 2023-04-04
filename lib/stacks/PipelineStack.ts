import { RemovalPolicy, Stack, StackProps, Stage, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Repository } from 'aws-cdk-lib/aws-codecommit';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from 'aws-cdk-lib/pipelines';
import { toPascal } from '../../util';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stacks } from '../Stacks';
import { config } from '../../config';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const { accounts, cicd } = config;

    const prefix = config.getPrefix();

    const repository = new Repository(this, `Repository`, {
      repositoryName: prefix,
      description: 'Amazon Connect Application Code'
    });
    repository.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const buildRolePolicies = [
      new PolicyStatement({
        actions: ['codecommit:GetBranch', 'codecommit:GetCommit'],
        resources: [repository.repositoryArn]
      }),
      new PolicyStatement({
        actions: ['connect:ListInstances', 'ds:DescribeDirectories'],
        resources: ['*']
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sts:assumeRole'],
        resources: [`arn:aws:iam::${cicd.id}:role/cdk-hnb659fds-*`]
      }),
      new PolicyStatement({
        actions: [
          'codeartifact:GetAuthorizationToken',
          'codeartifact:ReadFromRepository',
          'codeartifact:GetRepositoryEndpoint'
        ],
        resources: ['*']
      }),
      new PolicyStatement({
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:CreateChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:GetTemplate',
          'cloudformation:DeleteChangeSet',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:DescribeStackEvents',
          'cloudformation:DeleteStack'
        ],
        resources: ['*']
      }),
      new PolicyStatement({
        actions: ['s3:*'],
        resources: ['arn:aws:s3:::cdktoolkit-stagingbucket-*', 'arn:aws:s3:::cdk-hnb659fds-assets-*']
      }),
      new PolicyStatement({
        actions: ['*'],
        resources: ['*'],
        conditions: {
          'ForAnyValue:StringEquals': {
            'aws:CalledVia': ['cloudformation.amazonaws.com']
          }
        }
      }),
      new PolicyStatement({
        actions: ['sts:GetServiceBearerToken'],
        resources: ['*']
      })
    ];

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: `${prefix}-pipeline`,
      crossAccountKeys: true,
      selfMutation: true,
      publishAssetsInParallel: false,
      codeBuildDefaults: {
        rolePolicy: buildRolePolicies
      },
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.codeCommit(repository, 'master'),
        commands: [
          'node --version',
          'npm --version',
          `aws codeartifact login --tool npm --domain voicefoundry-cloud --domain-owner ${cicd.id} --repository vf --namespace @voicefoundry-cloud`,
          'npm install --legacy-peer-deps',
          'npx cdk synth'
        ]
      })
    });

    Object.keys(accounts).forEach(stage => {
      const { id, region, approval, connectInstanceId } = config.accounts[stage];

      const deploymentStage = new Stage(this, `Application${toPascal(stage)}Stage`);

      new Stacks(deploymentStage, {
        env: { account: id, region },
        config,
        stage,
        connectInstanceId
      });

      pipeline.addStage(deploymentStage, {
        pre: approval ? [new ManualApprovalStep(`connect-core-${stage}-manual-approval`)] : undefined
      });
    });

    //MAP tags
    Tags.of(scope).add('map-migrated', 'd-server-02w639x33oia5k');
  }
}
