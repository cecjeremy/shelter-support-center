#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
import { resolve } from 'path';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { CodeArtifact, config, SharedIniFileCredentials } from 'aws-sdk';
import {
  ROOT_DIR,
  getDirectoriesAtPath,
  exec,
  buildCodeArtifact,
  TTEC_DOMAIN_NAME,
  TTEC_REPOSITORY_NAME,
  buildNpmrc,
  buildUri,
  useCodeArtifact,
  getCAAuthToken
} from '../util';
import { config as appConfig } from '../config';

interface ModuleDefinition {
  packageDir: string;
  moduleName: string;
  version: string;
}

async function publishModule({
  moduleDir,
  account,
  region,
  authToken
}: {
  region: string;
  account: string;
  moduleDir: string;
  authToken: string;
  codeArtifact: CodeArtifact;
}) {
  await buildNpmrc({
    region,
    account,
    directory: moduleDir,
    authToken
  });
  await exec(`cd ${moduleDir} && npm publish`, false);
}

function buildOutput({ moduleName, version }: { moduleName: string; version: string }) {
  return `${moduleName}@${version}`;
}

async function publishAllModules({
  publishList,
  account,
  region,
  profile,
  authToken,
  codeArtifact
}: {
  publishList: ModuleDefinition[];
  account: string;
  region: string;
  profile: string;
  authToken: string;
  codeArtifact: CodeArtifact;
}) {
  console.log(`>>>
>>> publishing the following applications
>>>
>>> [ ${publishList.map(buildOutput).join(', ')} ]
>>>
>>> using profile ${profile ?? '"default"'}
>>> to https://${buildUri({ account, region })}
>>>
>>>`);

  const publishPromises = [];
  for (const { packageDir, moduleName } of publishList) {
    publishPromises.push(
      publishModule({
        moduleDir: resolve(packageDir, 'node_modules', '@ttec-dig-vf', moduleName),
        account,
        region,
        authToken,
        codeArtifact
      })
    );
  }
  await Promise.allSettled(publishPromises);
}

async function listPrivateModules(packageDir: string) {
  const modulesDir = resolve(packageDir, 'node_modules', '@ttec-dig-vf');
  const moduleVersions: ModuleDefinition[] = [];

  if (existsSync(modulesDir)) {
    const moduleNames: string[] = await readdir(modulesDir);
    for (const moduleName of moduleNames) {
      const pkgJson = require(resolve(modulesDir, moduleName, 'package.json'));
      const version = pkgJson.version;
      moduleVersions.push({
        packageDir,
        moduleName,
        version
      });
      const nested = await listPrivateModules(resolve(modulesDir, moduleName));
      moduleVersions.push(...nested);
    }
  }

  return moduleVersions;
}

async function filterPackages({
  modulesList,
  codeArtifact
}: {
  modulesList: ModuleDefinition[];
  codeArtifact: CodeArtifact;
}) {
  type ModuleTree = { [moduleName: string]: { [version: string]: string } };
  const existing: ModuleTree = {};

  const { packages = [] } = await codeArtifact
    .listPackages({ repository: TTEC_REPOSITORY_NAME, domain: TTEC_DOMAIN_NAME })
    .promise();
  for (const { package: PACKAGE } of packages) {
    const { versions = [] } = await codeArtifact
      .listPackageVersions({
        domain: TTEC_DOMAIN_NAME,
        repository: TTEC_REPOSITORY_NAME,
        package: `${PACKAGE}`,
        format: 'npm',
        namespace: 'ttec-dig-vf'
      })
      .promise();
    for (const { version } of versions) {
      if (!existing[`${PACKAGE}`]) {
        existing[`${PACKAGE}`] = {};
      }
      existing[`${PACKAGE}`][version] = 'exists';
    }
  }

  const publishMap: ModuleTree = {};
  const publishList: ModuleDefinition[] = [];

  for (const { moduleName, version, packageDir } of modulesList) {
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (!(existing[moduleName] && existing[moduleName][version])) {
      if (!publishMap[moduleName]) {
        publishMap[moduleName] = {};
      }
      publishMap[moduleName][version] = packageDir;
    }
  }

  for (const [moduleName, versions] of Object.entries(publishMap)) {
    for (const [version, packageDir] of Object.entries(versions)) {
      publishList.push({
        moduleName,
        version,
        packageDir
      });
    }
  }

  return publishList;
}

export async function publishToCodeArtifact() {
  const { id, region, profile } = appConfig.cicd;

  if (profile && !process.env.CICD) {
    config.credentials = new SharedIniFileCredentials({ profile });
  }
  const codeArtifact = new CodeArtifact({ region });

  /**
   *
   * build code artifact constructs if they don't already exist
   *
   */
  console.log('>>>\n>>> building CodeArtifact\n>>>');
  await buildCodeArtifact({ account: id, codeArtifact });

  /**
   *
   * recursively look in node_modules folders for all private @ttec-dig-vf modules
   * within the repo root an in all packages in packages/
   *
   * example: package.json requires cdk-resources@4.0.14 and connect-voicemail has
   * dependency for cdk-resources@4.0.7, the lower version will be inside of the
   * node_modules/connect-voicemail/node_modules/@ttec-dig-vf folder
   *
   */
  const modulesList: ModuleDefinition[] = await listPrivateModules(ROOT_DIR);

  /*
   *
   * deduplicate list of package/versions to only install once and then check against
   * CodeArtifact to see each is already been published.  only run publish for
   * missing packages
   *
   */
  const publishList = await filterPackages({ modulesList, codeArtifact });
  const authToken = await getCAAuthToken({ account: id, codeArtifact });
  await publishAllModules({ account: id, region, profile, authToken, publishList, codeArtifact });
}

if (require.main === module) {
  publishToCodeArtifact();
}
