import {
  Effect,
  FederatedPrincipal,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  SamlMetadataDocument,
  SamlProvider
} from 'aws-cdk-lib/aws-iam';
import { Environment, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

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
      metadataDocument: SamlMetadataDocument.fromXml(
        `
          <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://www.okta.com/xxxxxxxxxxxxxxxxxxxx">
          <md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
          <md:KeyDescriptor use="signing">
          <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
          <ds:X509Data>
          <ds:X509Certificate>MIIDrjCCApagAwIBAgIGAXkg6gtTMA0GCSqGSIb3DQEBCwUAMIGXMQswCQYDVQQGEwJVUzETMBEG A1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzENMAsGA1UECgwET2t0YTEU MBIGA1UECwwLU1NPUHJvdmlkZXIxGDAWBgNVBAMMD3ZvaWNlZm91bmRyeS1hdTEcMBoGCSqGSIb3 DQEJARYNaW5mb0Bva3RhLmNvbTAeFw0yMTA0MzAwMzUzMzlaFw0zMTA0MzAwMzU0MzlaMIGXMQsw CQYDVQQGEwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzEN MAsGA1UECgwET2t0YTEUMBIGA1UECwwLU1NPUHJvdmlkZXIxGDAWBgNVBAMMD3ZvaWNlZm91bmRy eS1hdTEcMBoGCSqGSIb3DQEJARYNaW5mb0Bva3RhLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEP ADCCAQoCggEBAIyp9fBIPg+DLGzlmkrvqwbjiR+s9VK6LAGQbSXYH6v4Djt+3SrFbxfAHZCCqbNm IfegAbSmMHNMAeNDUgtFCXQvaW2tKOcw+0PzNhiUDOvH3bC4RioH7ZVY27jRKuKk7Che7qWF455a ILOsEGYrYip7W1+vg7s81qqOy+560k9LGx6WNBiEjEU5zqY8a4O37nBS9m+968xj813De0HBiSQC ykZlDnb8aJb1wEov7+R4z3YcHCVZWB+ramhXyvA56q1Tww31A48lTWZb1VUuDzB/oOdinu1bIZRQ p2uUsY3gysBK9LIVPwB5DmuMyUrWTi26QDdTmgc3NT4iZNj0mP8CAwEAATANBgkqhkiG9w0BAQsF AAOCAQEAauonoOEC849lcMCOuFxJiG7HzGD+buzl5dJRjZ9g4CRpE6lV6lRGfXxYGMud2nfMa59c pW1EjrDGv4zIrWhrFVdAV6Pb4vZCbovKziA0cdTr8EiU7wmXppO3IwBywLK4oDxq6QmRNLw3ekzo 0PHv++kTMG9bXZkyuwJFZv94is90K/R9F43RHl1K3yYiSQEcGqkF56Cz1LKBsFdGx1+bWxYdW1hM IxjafM8ytlPhoGnPgF2T+hJkaBitQjxdOOlNeb5WxB8w9aNiGfJMYi99PI3C3lSFHEf/auFaa5Ci yUlsQnOdHHGBn2xOVQMm9LUCkhZe5pHzq8KZ0DrTJC7pxA==</ds:X509Certificate>
          </ds:X509Data>
          </ds:KeyInfo>
          </md:KeyDescriptor>
          <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat>
          <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
          <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://dummydomain.okta.com/app/xxxxxxxxxxxxxxxxxxxx/sso/saml"/>
          <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://dummydomain.okta.com/app/xxxxxxxxxxxxxxxxxxxx/sso/saml"/>
          </md:IDPSSODescriptor>
          </md:EntityDescriptor>
        `
      )
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

    new CfnOutput(this, 'RoleSessionName', { description: 'RoleSessionName', value: 'emailaddress or user.mail' });
    new CfnOutput(this, 'SessionDuration', { description: 'SessionDuration', value: '43200' });
    new CfnOutput(this, 'Role', {
      description: 'Role',
      value: samlProvider.samlProviderArn + ',' + samlConnectRole.roleArn
    });
  }
}
