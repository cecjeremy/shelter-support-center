import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Repository } from 'aws-cdk-lib/aws-codecommit';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from 'aws-cdk-lib/pipelines';
import { toPascal } from '../../util';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { VfApplicationStage } from '../stages/VfApplicationStage';
import { config } from '../../config';
import { ComputeType, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const { accounts, cicd } = config;

    const prefix = config.getPrefix();

    const repository = new Repository(this, `Repository`, {
      repositoryName: prefix,
      description: 'Amazon Connect Application Code'
    });

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
      codeBuildDefaults: {
        rolePolicy: buildRolePolicies,
        buildEnvironment: {
          computeType: ComputeType.MEDIUM,
          buildImage: LinuxBuildImage.STANDARD_5_0
        }
      },
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.codeCommit(repository, 'master'),
        commands: [
          'node --version',
          'npm --version',
          `aws codeartifact login --tool npm --domain voicefoundry-cloud --domain-owner ${cicd.id} --repository vf --namespace @voicefoundry-cloud`,
          'rm -f package-lock.json',
          'npm install'
        ]
      })
    });

    Object.keys(accounts).forEach(stage => {
      const { id, region, approval, connectInstanceId } = config.accounts[stage];

      const application = new VfApplicationStage(this, `Application${toPascal(stage)}Stage`, {
        env: { account: id, region },
        config,
        stage,
        connectInstanceId
      });

      pipeline.addStage(application, {
        pre: approval ? [new ManualApprovalStep(`connect-core-${stage}-manual-approval`)] : undefined
      });
    });
  }
}
