import { resolve } from 'path';

import { ServicePrincipal } from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from '@aws-cdk/aws-lambda-nodejs';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Construct, Duration, Stack, StackProps } from '@aws-cdk/core';

export interface ConnectLambdasProps extends StackProps {
  client: string;
  stage?: string;
  env: {
    account: string;
    region: string;
  };
  loggingLevel: 'debug' | 'info' | 'error';
  prefix: string;
  secretArn?: string;
  secretName?: string;
  connectInstanceId: string;
}

export class ConnectLambdas extends Stack {
  public lambdas: NodejsFunction[];
  constructor(scope: Construct, id: string, props: ConnectLambdasProps) {
    super(scope, id, props);

    const { env, stage, loggingLevel, prefix, connectInstanceId } = props;

    const getLambdaEntry = (lambdaName: string) => {
      return resolve(__dirname, '..', 'lambdas', lambdaName, 'handler.ts');
    };

    const globalFunctionProps: NodejsFunctionProps = {
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: Duration.seconds(8),
      logRetention: RetentionDays.ONE_MONTH,
      logRetentionRetryOptions: { maxRetries: 10 },
      memorySize: 1024
    };

    const globalEnvVars = {
      LOG_LEVEL: loggingLevel as string,
      ENVIRONMENT: stage as string
    };

    const secondsToMinutesLambda = new NodejsFunction(this, 'SecondsToMinutesConverterLambda', {
      ...globalFunctionProps,
      entry: getLambdaEntry('secondsToMinutesConverter'),
      functionName: `secondsToMinutesConverter-${prefix}`,
      environment: {
        ...globalEnvVars,
        SERVICE_NAME: `secondsToMinutesConverter-${prefix}`
      }
    });

    this.lambdas = [secondsToMinutesLambda];

    const addConnectPermission = (lambdaFunction: NodejsFunction): void => {
      lambdaFunction.addPermission(`${lambdaFunction.node.id}ConnectPermission`, {
        principal: new ServicePrincipal('connect.amazonaws.com'),
        action: 'lambda:InvokeFunction',
        sourceAccount: env.account,
        sourceArn: `arn:aws:connect:${env.region}:${env.account}:instance/${connectInstanceId}`
      });
    };

    this.lambdas.forEach(lambda => {
      addConnectPermission(lambda);
    });
  }
}
