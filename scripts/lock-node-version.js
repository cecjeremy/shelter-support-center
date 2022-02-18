/* eslint-disable  */
/**
 * This script executes before "npm install"
 * Lock the version of Node running based on the one set in the package.json
 */

const packageJson = require('../package.json');
const requiredNodeVersion = packageJson.engines.node;
const runningNodeVersion = process.version;

if (!runningNodeVersion.split('.')[0].includes(requiredNodeVersion)) {
  console.error(`>>>
>>>
>>> You are not running the required version of Node, please
>>> use version >= v${requiredNodeVersion}.0.0.  Lambdas are
>>> deployed as v14.x and goal is to sync the development env
>>> with what will be in the cloud
>>>
>>> NVM is great for managing versions.
>>> 
>>> https://github.com/nvm-sh/nvm
>>>
>>>`);

  // kill the process if the required node version is not the one running
  process.exit(1);
}
