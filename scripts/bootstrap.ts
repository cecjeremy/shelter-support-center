import { exec, getPackageDirectories } from '../util';
import { CloudFormation, config, SharedIniFileCredentials } from 'aws-sdk';
import { publishToCodeArtifact } from './publishToCodeArtifact';
import { config as appConfig } from '../config';

async function commitPackageLocks() {
  await exec('git restore --staged .');
  const packageDirs = await getPackageDirectories(true);
  const lockFiles = packageDirs.map(dir => `${dir}/package-lock.json`).join(' ');
  await exec(`git add ${lockFiles}`);
  await exec(`[[ \`git status --porcelain\` ]] && git commit -m "committing package-lock files" || exit 0`);
  await exec(`git push`);
}

async function cdkBootstrap(id: string, region: string, profile: string, trust?: string) {
  if (profile) {
    config.credentials = new SharedIniFileCredentials({ profile });
  }
  const cloudFormation = new CloudFormation({ region });
  try {
    await cloudFormation.describeStacks({ StackName: 'CDKToolkit' }).promise();
    throw new Error();
  } catch {
    // eslint-disable-next-line no-console
    console.log(`
>>>
>>> CDK Bootstrapping for AWS Account: ${id} / ${region}
>>> Using profile ${profile}
>>>`);

    if (id === trust) {
      await exec(`CDK_NEW_BOOTSTRAP=1 npm run cdk -- bootstrap aws://${id}/${region} --profile ${profile}`);
    } else {
      await exec(
        `CDK_NEW_BOOTSTRAP=1 npm run cdk -- bootstrap aws://${id}/${region} \
        --profile ${profile} \
        --trust ${trust} \
        --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`
      );
    }
  }
}

export async function bootstrap(): Promise<void> {
  await publishToCodeArtifact();

  const { accounts, cicd } = appConfig;

  for (const branch of Object.keys(accounts)) {
    const { id, region, profile } = accounts[branch];
    await cdkBootstrap(id, region, profile, cicd.id);
  }

  // deploy cicd pipeline
  await exec(`npx cdk deploy --require-approval never`);
}

if (require.main === module) {
  bootstrap();
}
