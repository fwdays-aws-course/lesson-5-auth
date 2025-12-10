import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { CognitoStack } from './cognito-stack';
import { BackendStack } from './backend-stack';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const cognitoStack = new CognitoStack(this, 'CognitoStack');
    const backendStack = new BackendStack(this, 'BackendStack', {
      userPoolId: cognitoStack.userPool.userPoolId,
      region: this.region,
    });
  }
}
