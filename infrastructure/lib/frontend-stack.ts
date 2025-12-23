import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as path from "path";
import { Construct } from "constructs";

export interface FrontendStackProps extends cdk.StackProps {
  /**
   * Path to the built frontend assets (relative to infrastructure directory)
   * Default: ../front-end/build/client
   */
  assetPath?: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props?: FrontendStackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `auth-frontend-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    this.distribution = new cloudfront.Distribution(this, "FrontendDistribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    this.distributionDomainName = this.distribution.distributionDomainName;

    const assetPath = props?.assetPath || path.join(__dirname, "../../front-end/build/client");
    
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset(assetPath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
      exclude: ["index.html", "config.js"],
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(cdk.Duration.days(365)),
        s3deploy.CacheControl.immutable(),
      ],
      prune: true,
      memoryLimit: 512,
    });

    new s3deploy.BucketDeployment(this, "DeployIndexHtml", {
      sources: [s3deploy.Source.asset(assetPath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/index.html"],
      include: ["index.html"],
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(cdk.Duration.seconds(0)),
        s3deploy.CacheControl.mustRevalidate(),
      ],
      prune: false,
    });

    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: this.bucket.bucketName,
      description: "S3 bucket name for frontend",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution ID",
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distributionDomainName,
      description: "CloudFront distribution domain name",
    });

    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `https://${this.distributionDomainName}`,
      description: "Frontend application URL",
    });
  }
}

