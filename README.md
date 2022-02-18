# Description

Shelter Insurance Support Center Amazon Connect deployment pipeline and infrastructure.

---

## Table of Contents

- [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Bootstrapping](#bootstrapping)
    - [Bootstrapping Details](#bootstrapping-details)
  - [CICD](#cicd)
  - [Important things to know](#important-things-to-know)
    - [Connect API Limitations](#connect-api-limitations)
    - [OSX quirks](#osx-quirks)

Architecture Diagrams

- [project-architecture-diagram](docs/project-architecture-diagram.pdf)

---

## Bootstrapping

1. Ensure all client AWS accounts are created.
2. Update `config.ts` file with client and account details.
3. `npm install`
4. `npm run bootstrap`
5. After the deployment is successfull and the codepipeline completes, update the config file with the Amazon Connect Instance Id for each account.
6. Push the change to the master branch of the CodeCommit repo. This will kick off another pipeline and successfully deploy the operations management portal. _Note: due to limitations of Amazon Connect cloudformation resources we don't currently support a way to get the instance id programatically_

### Bootstrapping Details

- Ensure the config file is properly set up for all the apps you plan on deploying to each AWS environment.

- Run `npm i` from the root.

After all configs are set up, then you can run from the root directory:

```bash
npm run bootstrap
```

This will:

- Publish all private packages to the client's Prod CodeArtifact
  - See [Publishing to Client CodeArtifact](#publishing-to-client-codeartifact) for more detail.
- Bootstrap all AWS environments with CDK (if not done already)
- Synth/Deploy the `pipeline` CDK stack
- Run the CodePipeline which will:
  - Deploy all application packages into all stages/environments.

From this point forward, further deployment will be handled by the CodePipeline on pushes to the `master/main` branch.

---

_*IMPORTANT*_: If you do not need `connect-core` (because the a Connect Instance is already created/will be created manually), see [Removing connect-core](#removing-connect-core)

```text
    ├── bin                               # cdk apps
        ├── app.ts                        # main cdk pipeline deployment script
    ├── lib                               # shared scripts/helper functions
        ├── constructs                    # cdk constructs
        ├── stacks                        # deployment stacks
        ├── stages                        # pipeline stages
    ├── scripts                           # support scripts
    ├── util                              # utility and helper functions
    ├── config.ts                         # app configuration
    └── README.md
```

---

## CICD

The CICD pipeline is deployed when bootstrapping the project. A CDK stack will be deployed from the `pacakges/cicd` folder originating from the developers local machine.

Updates to the CICD stack can only be made from the dev machine, not from github webhooks (this is intentional to avoid circular updates).

Once the CICD stack is deployed, future builds will be kicked off from changes to any files within the `packages/` directory (other than cicd). Only packages that have files changed between github pushes will be updated.

In other words, if only files in `packages/connect-lambdas` changed, the CICD pipeline will only synth/deploy the stack for `connect-lambdas`.

If you plan on deploying a Connect instance via the template, it will automatically be the first package to deploy -- this is because other packages (admin, voicemail) are dependent on an existing Connect Instance. There are scripts in the template repo to automatically pull the `instanceId` from the instance created via `connect-core`.

![architechure diagram](./docs/project-architecture-diagram.png)

---

## Important things to know

This repo is built to work with Node.js 14.x so that the development environment matches the runtime environment within Lambda, CodeBuild, etc. If you are on an M1 mac you will have to make sure you are running withing Rosetta. See [this blog post](https://dev.to/ibrarturi/how-to-fix-m1-mac-issue-with-installing-node-versions-30ah) for more details.

### Connect API Limitations

Connect as a service limits the number of `CreateInstance` and `DeleteInstance` api calls that can be made against an account in a month. Please only create the instances and try not to build them for branches or you will get locked of building them. This is a hard limit and the number is unpublished. [see here](https://docs.aws.amazon.com/connect/latest/APIReference/API_CreateInstance.html) Once this happens there is nothing you can do about it. You won't even be able to build them from the console at that point.

### OSX quirks

You need [Cmake](https://cmake.org/download/) installed due to `aws-crt`
