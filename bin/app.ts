import { App } from '@aws-cdk/core';
import { PipelineStack } from '../lib/stacks/PipelineStack';
import { config } from '../config';

const app = new App();

new PipelineStack(app, 'PipelineStack', {
  stackName: `${config.getPrefix()}-cicd`,
  description: 'VF Main CICD Pipeline Stack',
  env: { account: config.cicd.id, region: config.cicd.region }
});

// (async function buildInfra() {
//   const config = await getConfig();
//   const { project, client, cicd, accounts } = config;
//   const cicdAccount = await getRepoAccount();

//   const prefix = `${client}-${project}`;

//   let respository: IRepository;

//   const cicd = new Stack(app, `CICDStack`, {
//     stackName: `${prefix}-cicd`,
//     env: {
//       account: cicdAccount.id,
//       region: cicdAccount.region
//     }
//   });

//   if (!repo.repoArn) {
//     respository = new Repository(cicd, `CodecommitRepository`, {
//       repositoryName: prefix,
//       description: 'Amazon Connect application code'
//     });
//   } else {
//     respository = Repository.fromRepositoryArn(app, 'CodecommitRepository', repo.repoArn);
//   }

//   // Create the log group for the builds (Codebuild Projects) to use
//   const buildLogGroup = new LogGroup(cicd, 'BuildLogGroup', {
//     logGroupName: `/aws/codebuild/test/${prefix}-cicd-build`
//   });

//   const buildRolePolicies = [
//     new PolicyStatement({
//       actions: ['logs:DescribeLogGroups', 'logs:CreateLogStream', 'logs:PutLogEvents'],
//       resources: [buildLogGroup.logGroupArn]
//     }),
//     new PolicyStatement({
//       actions: ['codecommit:GetBranch', 'codecommit:GetCommit'],
//       resources: [respository.repositoryArn]
//     }),
//     new PolicyStatement({
//       effect: Effect.ALLOW,
//       actions: ['sts:assumeRole'],
//       resources: [`arn:aws:iam::${cicdAccount.id}:role/cdk-hnb659fds-*`]
//     }),
//     new PolicyStatement({
//       actions: ['connect:ListInstances', 'ds:DescribeDirectories'],
//       resources: ['*']
//     }),
//     new PolicyStatement({
//       actions: ['codeartifact:GetAuthorizationToken'],
//       resources: [`arn:aws:codeartifact:${cicdAccount.region}:${cicdAccount.id}:domain/${TTEC_DOMAIN_NAME}`]
//     }),
//     new PolicyStatement({
//       actions: ['codeartifact:ReadFromRepository'],
//       resources: [
//         `arn:aws:codeartifact:${cicdAccount.region}:${cicdAccount.id}:repository/${TTEC_DOMAIN_NAME}/${TTEC_REPOSITORY_NAME}`
//       ]
//     }),
//     new PolicyStatement({
//       actions: [
//         'cloudformation:DescribeStacks',
//         'cloudformation:CreateChangeSet',
//         'cloudformation:DescribeChangeSet',
//         'cloudformation:GetTemplate',
//         'cloudformation:DeleteChangeSet',
//         'cloudformation:ExecuteChangeSet',
//         'cloudformation:DescribeStackEvents',
//         'cloudformation:DeleteStack'
//       ],
//       resources: ['*']
//     }),
//     new PolicyStatement({
//       actions: ['s3:*'],
//       resources: ['arn:aws:s3:::cdktoolkit-stagingbucket-*', 'arn:aws:s3:::cdk-hnb659fds-assets-*']
//     }),
//     new PolicyStatement({
//       actions: ['*'],
//       resources: ['*'],
//       conditions: {
//         'ForAnyValue:StringEquals': {
//           'aws:CalledVia': ['cloudformation.amazonaws.com']
//         }
//       }
//     }),
//     new PolicyStatement({
//       actions: ['sts:GetServiceBearerToken'],
//       resources: ['*']
//     })
//   ];

//   const installCommands = [
//     'node --version',
//     'npm --version',
//     'chmod +x ./scripts/loginToCodeArtifact.sh',
//     './scripts/loginToCodeArtifact.sh --account $CA_ACCOUNT --region $CA_REGION',
//     'npm install --no-scripts'
//   ];

//   const buildEnvironment = {
//     buildImage: LinuxBuildImage.STANDARD_5_0,
//     computeType: ComputeType.MEDIUM
//   };

//   const sourceArtifact = new Artifact();
//   const cloudAssemblyArtifact = new Artifact();
//   const pipeline = new CdkPipeline(cicd, 'Pipeline', {
//     pipelineName: `${prefix}-pipeline`,
//     cloudAssemblyArtifact,
//     sourceAction: new CodeCommitSourceAction({
//       actionName: 'CodeCommit',
//       output: sourceArtifact,
//       repository: respository,
//       branch: 'master'
//     }),
//     synthAction: SimpleSynthAction.standardNpmSynth({
//       environment: {
//         ...buildEnvironment,
//         environmentVariables: {
//           CA_ACCOUNT: { value: cicdAccount.id },
//           CA_REGION: { value: cicdAccount.region },
//           CICD: { value: true }
//         }
//       },
//       sourceArtifact,
//       cloudAssemblyArtifact,
//       rolePolicyStatements: buildRolePolicies,
//       installCommand: installCommands.join(' && ')
//     })
//   });

//   Object.keys(accounts).forEach(branch => {
//     const { stage, id, region } = config.accounts[branch];

//     pipeline.addStage(`${toPascal(stage)}Approval`).addManualApprovalAction();
//     pipeline.addApplicationStage(
//       new VfApplicationStage(cicd, `${toPascal(stage)}Stage`, {
//         env: { account: id, region }
//       })
//     );
//   });

//   app.synth();
// })();
