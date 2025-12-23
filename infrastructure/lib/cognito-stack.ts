import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly cognitoDomainName: string;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly authenticatedRole: iam.Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "AuthUserPool", {
      userPoolName: "auth-user-pool",
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      /**
       * IMPORTANT (immutability):
       * Cognito UserPool sign-in identity settings are backed by CloudFormation
       * `AliasAttributes` / `UsernameAttributes`, which CANNOT be updated after the pool is created.
       *
       * This environment is expected to be created with:
       * - username sign-in enabled
       * - email also allowed as an alias
       *
       * (This maps to CloudFormation `AliasAttributes: ["email"]`.)
       *
       * Do NOT change this value after first deploy, or future deployments will fail with:
       * "Updates are not allowed for property - AliasAttributes."
       */
      signInAliases: {
        username: true,
        email: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, "AuthUserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: "auth-client",
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    /**
     * Cognito Hosted UI domain.
     *
     * Using existing hardcoded domain that already exists in Cognito.
     * We don't create the domain resource in CloudFormation since it already exists.
     * Full domain: https://auth-app-fwdays.auth.eu-west-2.amazoncognito.com
     */
    const domainPrefix = "auth-app-fwdays";
    const stack = cdk.Stack.of(this);
    const region = stack.region || "eu-west-2";

    // Domain already exists in Cognito, so we just reference it by name
    // Don't create the domain resource in CloudFormation
    this.cognitoDomainName = `${domainPrefix}.auth.${region}.amazoncognito.com`;

    this.identityPool = new cognito.CfnIdentityPool(this, "AuthIdentityPool", {
      identityPoolName: "auth-identity-pool",
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    this.authenticatedRole = new iam.Role(this, "AuthenticatedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    this.authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // Minimal set typically needed for Identity Pool credential exchange
          "cognito-identity:GetId",
          "cognito-identity:GetOpenIdToken",
          "cognito-identity:GetCredentialsForIdentity",
        ],
        resources: ["*"],
      })
    );

    // Attach role to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: this.identityPool.ref,
        roles: {
          authenticated: this.authenticatedRole.roleArn,
        },
      }
    );

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    });

    // new cdk.CfnOutput(this, "UserPoolDomainUrl", {
    //   value: this.userPoolDomain.baseUrl(),
    //   description: "Cognito Hosted UI domain base URL",
    // });

    new cdk.CfnOutput(this, "CognitoDomainName", {
      value: this.cognitoDomainName,
      description: "Cognito Hosted UI domain hostname (no protocol)",
    });

    new cdk.CfnOutput(this, "CognitoDomainPrefix", {
      value: domainPrefix,
      description: "Cognito domain prefix used (for debugging)",
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: this.identityPool.ref,
      description: "Cognito Identity Pool ID",
    });
  }
}
