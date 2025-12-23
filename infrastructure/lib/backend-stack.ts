import * as cdk from "aws-cdk-lib";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface BackendStackProps extends cdk.StackProps {
  userPoolId: string;
  region: string;
  /**
   * Allowed CORS origins for the API (comma-separated supported).
   * Example: https://d21qxpkeqvjscm.cloudfront.net
   */
  corsOrigin?: string;
}

export class BackendStack extends cdk.Stack {
  public readonly service: apprunner.CfnService;
  public readonly backendUrl: string;
  public readonly ecrRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    this.ecrRepository = new ecr.Repository(this, "BackendRepository", {
      repositoryName: "auth-backend",
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 10, // Keep last 10 images
          tagStatus: ecr.TagStatus.ANY,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const appRunnerTasksRole = new iam.Role(this, "AppRunnerTasksRole", {
      assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
    });

    const appRunnerBuildRole = new iam.Role(this, "AppRunnerBuildRole", {
      assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
    });

    this.ecrRepository.grantPull(appRunnerBuildRole);

    const serviceConfig = new apprunner.CfnService(this, 'AppRunnerService', {
        serviceName: 'auth-backend',
        sourceConfiguration: {
          imageRepository: {
            imageIdentifier: `${this.ecrRepository.repositoryUri}:latest`,
            imageRepositoryType: 'ECR',
            imageConfiguration: {
              port: '3000',
              runtimeEnvironmentVariables: [
                {
                  name: 'USER_POOL_ID',
                  value: props.userPoolId,
                },
                {
                  name: 'AWS_REGION',
                  value: props.region,
                },
                ...(props.corsOrigin
                  ? [
                      {
                        name: 'CORS_ORIGIN',
                        value: props.corsOrigin,
                      },
                    ]
                  : []),
                {
                  name: 'NODE_ENV',
                  value: 'production',
                },
              ],
              startCommand: 'npx fastify start -l info -a 0.0.0.0 dist/app.js',
            },
          },
          autoDeploymentsEnabled: true,
          authenticationConfiguration: {
            accessRoleArn: appRunnerBuildRole.roleArn,
          },
        },
        instanceConfiguration: { instanceRoleArn: appRunnerTasksRole.roleArn },
        healthCheckConfiguration: {
          protocol: 'HTTP',
          path: '/health',
        },
      });

    this.service = serviceConfig;
    this.backendUrl = `https://${serviceConfig.attrServiceUrl}`;

    // Outputs (for reference in nested stack)
    // Keep this output for backward compatibility: older parent stacks may still
    // import this export, and CloudFormation will fail updates if we remove it.
    new cdk.CfnOutput(this, 'AppRunnerServiceArn', {
      value: serviceConfig.attrServiceArn,
      description: 'App Runner Service ARN',
    });

    new cdk.CfnOutput(this, 'BackendEcrRepositoryUri', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR Repository URI for Backend',
    });

    new cdk.CfnOutput(this, 'BackendApiUrl', {
      value: this.backendUrl,
      description: 'Backend API URL',
    });
  }
}
