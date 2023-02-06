import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { CodeArtifact } from 'aws-sdk';
import { exec } from './exec';
import { getAWSAccounts } from './getAWSAccounts';
import { ROOT_DIR, getPackageDirectories } from './directoryUtils';

export const TTEC_DOMAIN_NAME = 'voicefoundry-cloud';
export const TTEC_REPOSITORY_NAME = 'vf';

async function buildIfNoDomain({ account, codeArtifact }: { account: string; codeArtifact: CodeArtifact }) {
  try {
    await codeArtifact.describeDomain({ domain: TTEC_DOMAIN_NAME, domainOwner: account }).promise();
  } catch {
    await codeArtifact.createDomain({ domain: TTEC_DOMAIN_NAME }).promise();
  }
}

async function buildIfNoRepository({ account, codeArtifact }: { account: string; codeArtifact: CodeArtifact }) {
  try {
    await codeArtifact
      .describeRepository({ domain: TTEC_DOMAIN_NAME, repository: TTEC_REPOSITORY_NAME, domainOwner: account })
      .promise();
  } catch {
    await codeArtifact
      .createRepository({ domain: TTEC_DOMAIN_NAME, repository: TTEC_REPOSITORY_NAME, domainOwner: account })
      .promise();
  }
}

async function setDomainPermissionsIfNone({ account, codeArtifact }: { account: string; codeArtifact: CodeArtifact }) {
  const accountPrincipals = getAWSAccounts();
  const accountPrincipalsJSON = accountPrincipals.map(account => `"arn:aws:iam::${account.id}:root"`).join(',');
  const setPermissions = async () => {
    const policy = `{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "ContributorPolicy",
                "Effect": "Allow",
                "Principal": {
                    "AWS": [${accountPrincipalsJSON}]
                },
                "Action": [
                    "codeartifact:GetRepositoryEndpoint",
                    "codeartifact:GetAuthorizationToken",
                    "codeartifact:ReadFromRepository",
                    "sts:GetServiceBearerToken"
                ],
                "Resource": "*"
            }
        ]
      }`;
    const policyDocument = JSON.stringify(JSON.parse(policy));
    await codeArtifact
      .putDomainPermissionsPolicy({ domain: TTEC_DOMAIN_NAME, domainOwner: account, policyDocument })
      .promise();
  };

  try {
    const existingPolicy = await codeArtifact
      .getDomainPermissionsPolicy({ domain: TTEC_DOMAIN_NAME, domainOwner: account })
      .promise();

    if (existingPolicy.policy?.document) {
      const policyJSON = JSON.parse(existingPolicy.policy.document);
      const policySet: Set<string> = new Set(policyJSON.Statement[0].Principal.AWS);
      const accountPrincipalsSet: Set<string> = new Set(
        accountPrincipals.map(account => `arn:aws:iam::${account.id}:root`)
      );

      const areSetsEqual = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(value => b.has(value));

      if (!areSetsEqual(policySet, accountPrincipalsSet)) {
        await setPermissions();
      }
    }
  } catch {
    await setPermissions();
  }
}

export async function buildCodeArtifact({ account, codeArtifact }: { account: string; codeArtifact: CodeArtifact }) {
  await buildIfNoDomain({ account, codeArtifact });
  await buildIfNoRepository({ account, codeArtifact });
  await setDomainPermissionsIfNone({ account, codeArtifact });
}

export function buildUri({ region, account }: { region: string; account: string }) {
  return `${TTEC_DOMAIN_NAME}-${account}.d.codeartifact.${region}.amazonaws.com/npm/${TTEC_REPOSITORY_NAME}/`;
}

export async function buildNpmrc({
  region,
  account,
  directory,
  authToken
}: {
  region: string;
  account: string;
  directory: string;
  authToken: string;
}) {
  const uri = buildUri({ region, account });
  const npmrc = `registry=https://registry.npmjs.org 
  @voicefoundry-cloud:registry=https://${uri}
  //${uri}:always-auth=true
  //${uri}:_authToken=${authToken}`;

  const filename = resolve(directory, '.npmrc');
  await writeFile(filename, npmrc);
}

export async function publishPrivateModule({
  directory,
  account,
  region,
  authToken
}: {
  region: string;
  account: string;
  directory: string;
  authToken: string;
  codeArtifact: CodeArtifact;
}) {
  await buildNpmrc({
    region,
    account,
    directory,
    authToken
  });
  await exec(`cd ${directory} && npm publish`, false);
}

export async function getCAAuthToken({ account, codeArtifact }: { account: string; codeArtifact: CodeArtifact }) {
  const { authorizationToken: authToken } = await codeArtifact
    .getAuthorizationToken({ domain: TTEC_DOMAIN_NAME, domainOwner: account })
    .promise();
  if (!authToken) {
    throw new Error('Could not get codeArtifact authorization token');
  }
  return authToken;
}

export async function fixPackageLock(directory: string) {
  await exec(`(cd ${directory} && rimraf package-lock.json)`);
  await exec(`(cd ${directory} && rimraf node_modules/@voicefoundry-cloud)`);
  return exec(`(cd ${directory} && npm i)`, false);
}

export async function fixPackageLocks(directories: string[]) {
  const updatePromises: Promise<string>[] = [];
  for (const directory of directories) {
    updatePromises.push(fixPackageLock(directory));
  }
  await Promise.all(updatePromises);
}

export async function loginCodeArtifact({
  account,
  region,
  authToken,
  directories
}: {
  account: string;
  region: string;
  authToken: string;
  directories: string[];
}) {
  for (const directory of directories) {
    await buildNpmrc({ region, account, directory, authToken });
  }
}

export async function useCodeArtifact({
  account,
  region,
  authToken,
  directories,
  updatePackageLock = false
}: {
  account: string;
  region: string;
  authToken: string;
  directories?: string[];
  updatePackageLock?: boolean;
}) {
  let _directories = directories;
  if (!_directories) {
    _directories = await getPackageDirectories();
    _directories.push(ROOT_DIR);
  }
  await loginCodeArtifact({
    account,
    region,
    authToken,
    directories: _directories
  });
  if (updatePackageLock) {
    // eslint-disable-next-line no-console
    console.log('updating package-lock files. this will be few moments');
    await fixPackageLocks(_directories);
  }
}

export async function useGitHub({
  directories,
  updatePackageLock = false
}: {
  directories?: string[];
  updatePackageLock?: boolean;
}) {
  let _directories = directories;
  if (!_directories) {
    _directories = await getPackageDirectories(true);
    _directories.push(ROOT_DIR);
  }
  for (const directory of _directories) {
    await exec(`(cd ${directory} && rimraf .npmrc)`);
  }

  if (updatePackageLock) {
    // eslint-disable-next-line no-console
    console.log('updating package-lock files. this will be few moments');
    await fixPackageLocks(_directories);
  }
}
