import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-codecommit';
import { CdkPipeline, SimpleSynthAction } from '@aws-cdk/pipelines';
import { CodeCommitSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { ComputeType, LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { toPascal } from '../../util';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { ConnectCoreStage } from '../stages/ConnectCoreStage';
import { AdminAppStage } from '../stages/AdminAppStage';
import { config } from '../../config';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const { accounts, cicd } = config;

    const prefix = config.getPrefix();

    const respository = new Repository(this, `Repository`, {
      repositoryName: prefix,
      description: 'Amazon Connect Application Code'
    });

    const buildRolePolicies = [
      new PolicyStatement({
        actions: ['codecommit:GetBranch', 'codecommit:GetCommit'],
        resources: [respository.repositoryArn]
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

    const sourceArtifact = new Artifact('source');
    const synthArtifact = new Artifact('synth');
    const pipeline = new CdkPipeline(this, 'Pipeline', {
      pipelineName: `${prefix}-pipeline`,
      cloudAssemblyArtifact: synthArtifact,
      sourceAction: new CodeCommitSourceAction({
        actionName: 'CodeCommit',
        output: sourceArtifact,
        repository: respository,
        branch: 'master'
      }),
      synthAction: SimpleSynthAction.standardNpmSynth({
        actionName: `Synth`,
        environment: {
          buildImage: LinuxBuildImage.STANDARD_5_0,
          computeType: ComputeType.MEDIUM
        },
        sourceArtifact,
        cloudAssemblyArtifact: synthArtifact,
        rolePolicyStatements: buildRolePolicies,
        installCommand: [
          'node --version',
          'npm --version',
          `aws codeartifact login --tool npm --domain ttec-dig-vf --domain-owner ${cicd.id} --repository vf --namespace @ttec-dig-vf`,
          'rm -f package-lock.json',
          'npm install'
        ].join(' && ')
      })
    });

    Object.keys(accounts).forEach(stage => {
      const { id, region, approval, connectInstanceId } = config.accounts[stage];

      const application = new ConnectCoreStage(this, `ConnectCore${toPascal(stage)}Stage`, {
        env: { account: id, region },
        config,
        stage,
        connectInstanceId
      });

      pipeline.addApplicationStage(application, { manualApprovals: approval });
    });

    Object.keys(accounts).forEach(stage => {
      const { id, region, approval, connectInstanceId } = config.accounts[stage];

      const application = new AdminAppStage(this, `${config.getPrefix(stage)}`, {
        env: { account: id, region },
        config,
        stage,
        connectInstanceId
      });

      pipeline.addApplicationStage(application, { manualApprovals: approval });
    });
  }
}
