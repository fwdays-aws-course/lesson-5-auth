import * as cdk from "aws-cdk-lib";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface BackendStackProps extends cdk.StackProps {
  userPoolId: string;
  region: string;
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

    // Create IAM role for App Runner service
    const appRunnerTasksRole = new iam.Role(this, "AppRunnerTasksRole", {
      assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
      description: "Role for App Runner service to access AWS resources",
    });

    const appRunnerBuildRole = new iam.Role(this, "AppRunnerBuildRole", {
      assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
      description: "Role for App Runner to pull images from ECR",
    });

    const logGroup = new logs.LogGroup(this, 'AppRunnerLogGroup', {
        logGroupName: '/aws/apprunner/auth-backend',
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
  

    this.ecrRepository.grantPull(appRunnerTasksRole);

    const observabilityConfig = this.createObservabilityConfig(logGroup);
  }

  /**
   * Creates an observability configuration for App Runner
   * This enables CloudWatch logging and tracing
   */
  private createObservabilityConfig(logGroup: logs.LogGroup): apprunner.CfnObservabilityConfiguration {
    const observabilityConfig = new apprunner.CfnObservabilityConfiguration(
      this,
      'AppRunnerObservabilityConfig',
      {
        observabilityConfigurationName: `auth-backend-observability`,
        traceConfiguration: {
          vendor: 'AWSXRAY',
        },
      }
    );

    // Grant App Runner permission to write to CloudWatch Logs
    logGroup.grantWrite(
      new iam.ServicePrincipal('apprunner.amazonaws.com')
    );

    return observabilityConfig;
  }
}
