import {
  Effect,
  FederatedPrincipal,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  SamlMetadataDocument,
  SamlProvider
} from '@aws-cdk/aws-iam';
import { Construct, Environment, Stack, StackProps } from '@aws-cdk/core';

export interface SsoStackProps extends StackProps {
  env: Required<Environment>;
  prefix: Required<string>;
  connectInstanceId: Required<string>;
}

export class SsoStack extends Stack {
  constructor(scope: Construct, id: string, props: SsoStackProps) {
    super(scope, id, props);

    const { env, prefix, connectInstanceId } = props;

    const samlFederationPolicy = new ManagedPolicy(this, 'SamlFederationPolicy', {
      managedPolicyName: `${prefix}-federation-connect-policy`,
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['connect:GetFederationToken'],
            resources: [
              `arn:aws:connect:${env.region}:${env.account}:instance/${connectInstanceId}/user/\${aws:userid}`
            ]
          })
        ]
      })
    });

    const samlProvider = new SamlProvider(this, 'SamlProvider', {
      name: `${prefix}-federation-connect-idp`,
      metadataDocument: SamlMetadataDocument.fromXml('insert-metadata-here')
    });

    const samlConnectRole = new Role(this, 'SamlAmazonConnectRole', {
      roleName: `${prefix}-federation-connect-role`,
      assumedBy: new FederatedPrincipal(
        samlProvider.samlProviderArn,
        {
          StringEquals: { 'SAML:aud': 'https://signin.aws.amazon.com/saml' }
        },
        'sts:AssumeRoleWithSAML'
      )
    });

    samlConnectRole.addManagedPolicy(samlFederationPolicy);
  }
}
