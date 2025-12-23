import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoStack } from './cognito-stack';
import { BackendStack } from './backend-stack';
import { FrontendStack } from './frontend-stack';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    /**
     * Cognito UserPool has immutable properties (notably AliasAttributes / UsernameAttributes).
     * If a stack update ever attempts to change them, CloudFormation will fail and the whole
     * deployment becomes blocked.
     *
     * To make deployments resilient, we support "external Cognito" mode:
     * - Provide existing IDs via env vars and CDK will NOT manage Cognito resources.
     * - Otherwise, CDK will create/manage Cognito (best for fresh environments).
     *
     * Env vars (all or nothing):
     * - EXISTING_USER_POOL_ID
     * - EXISTING_USER_POOL_CLIENT_ID
     * - EXISTING_IDENTITY_POOL_ID
     */
    const existingUserPoolId = process.env.EXISTING_USER_POOL_ID;
    const existingUserPoolClientId = process.env.EXISTING_USER_POOL_CLIENT_ID;
    const existingIdentityPoolId = process.env.EXISTING_IDENTITY_POOL_ID;

    const usingExternalCognito = Boolean(
      existingUserPoolId && existingUserPoolClientId && existingIdentityPoolId
    );

    const cognito = usingExternalCognito
      ? {
          userPoolId: existingUserPoolId!,
          userPoolClientId: existingUserPoolClientId!,
          identityPoolId: existingIdentityPoolId!,
          cognitoDomainName: undefined as string | undefined,
        }
      : (() => {
          // Create Cognito stack (OAuth callback/logout URLs are finalized in GitHub Actions
          // after we know the CloudFront distribution domain name).
          const cognitoStack = new CognitoStack(this, 'CognitoStack');
          return {
            userPoolId: cognitoStack.userPool.userPoolId,
            userPoolClientId: cognitoStack.userPoolClient.userPoolClientId,
            identityPoolId: cognitoStack.identityPool.ref,
            cognitoDomainName: cognitoStack.cognitoDomainName,
          };
        })();
    
    // Create frontend stack (assets deployment only). Runtime config (config.js) is
    // uploaded in GitHub Actions after all stack outputs are known.
    const frontendStack = new FrontendStack(this, 'FrontendStack');

    // Create backend stack (CORS origin can reference CloudFront domain)
    const backendStack = new BackendStack(this, 'BackendStack', {
      userPoolId: cognito.userPoolId,
      region: this.region,
      corsOrigin: `https://${frontendStack.distributionDomainName}`,
    });

    // Re-export outputs at the parent stack level for GitHub Actions
    // Frontend Outputs
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendStack.bucket.bucketName,
      description: 'S3 bucket name for frontend',
      exportName: `${this.stackName}-FrontendBucketName`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: frontendStack.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${this.stackName}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: frontendStack.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${this.stackName}-DistributionDomainName`,
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${frontendStack.distributionDomainName}`,
      description: 'Frontend application URL',
      exportName: `${this.stackName}-FrontendUrl`,
    });

    // Backend Outputs
    new cdk.CfnOutput(this, 'BackendEcrRepositoryUri', {
      value: backendStack.ecrRepository.repositoryUri,
      description: 'ECR Repository URI for Backend',
      exportName: `${this.stackName}-BackendEcrRepositoryUri`,
    });

    new cdk.CfnOutput(this, 'BackendApiUrl', {
      value: backendStack.backendUrl,
      description: 'Backend API URL',
      exportName: `${this.stackName}-BackendApiUrl`,
    });

    // Keep exporting the App Runner Service ARN. Earlier deployments referenced
    // this value, and removing it can cause CloudFormation to fail updates due
    // to "cannot delete export ... in use" when stacks are deployed in sequence.
    new cdk.CfnOutput(this, 'BackendServiceArn', {
      value: backendStack.service.attrServiceArn,
      description: 'App Runner Service ARN for backend',
      exportName: `${this.stackName}-BackendServiceArn`,
    });

    // Cognito Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: cognito.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${this.stackName}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: cognito.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${this.stackName}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: cognito.identityPoolId,
      description: 'Cognito Identity Pool ID',
      exportName: `${this.stackName}-IdentityPoolId`,
    });

    // Optional Cognito domain output (only when CDK manages the UserPoolDomain)
    if (cognito.cognitoDomainName) {
      new cdk.CfnOutput(this, 'CognitoDomainName', {
        value: cognito.cognitoDomainName,
        description: 'Cognito Hosted UI domain hostname (no protocol)',
        exportName: `${this.stackName}-CognitoDomainName`,
      });
    }
  }
}
