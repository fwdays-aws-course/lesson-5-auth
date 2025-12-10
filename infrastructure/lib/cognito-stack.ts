import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly authenticatedRole: iam.Role;
  public readonly unauthenticatedRole: iam.Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "AuthUserPool", {
      userPoolName: "auth-user-pool",
      // Дозволяємо користувачам реєструватися самостійно
      selfSignUpEnabled: true,
      // Автоматично підтверджуємо email після реєстрації (для навчальних цілей)
      // У продакшені краще використовувати email верифікацію
      autoVerify: {
        email: true,
      },
      // Налаштування паролів
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      // Дозволяємо вход через email або username
      signInAliases: {
        email: true,
        username: true,
      },
      // Налаштування MFA (Multi-Factor Authentication)
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      // Налаштування відновлення акаунту
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      // Видаляємо невикористані акаунти через 30 днів
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Тільки для навчальних цілей!
    });

    this.userPoolClient = new cognito.UserPoolClient(
      this,
      "AuthUserPoolClient",
      {
        userPool: this.userPool,
        userPoolClientName: "auth-client",
        // Дозволяємо потоки аутентифікації для веб-додатків
        authFlows: {
          userPassword: true, // Прямий вхід з паролем
          userSrp: true, // Secure Remote Password (рекомендований)
          adminUserPassword: true, // Для адміністраторів
        },
        // Генеруємо refresh tokens для автоматичного оновлення access tokens
        generateSecret: false, // false для публічних клієнтів (SPA, мобільні додатки)
        // Тривалість життя токенів
        accessTokenValidity: cdk.Duration.hours(1),
        idTokenValidity: cdk.Duration.hours(1),
        refreshTokenValidity: cdk.Duration.days(30),
        // Дозволяємо OAuth flows для соціального входу
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
            implicitCodeGrant: true,
          },
          scopes: [
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.PROFILE,
          ],
          // Callback URLs для OAuth (будуть налаштовані пізніше)
          callbackUrls: ["http://localhost:5173/callback"],
          logoutUrls: ["http://localhost:5173"],
        },
      }
    );

    this.identityPool = new cognito.CfnIdentityPool(this, "AuthIdentityPool", {
      identityPoolName: "auth-identity-pool",
      allowUnauthenticatedIdentities: false, // Забороняємо неавторизований доступ
      // Зв'язуємо Identity Pool з User Pool
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
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*",
        ],
        resources: ["*"],
      })
    );

    this.unauthenticatedRole = new iam.Role(this, "UnauthenticatedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // Зв'язуємо ролі з Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: this.identityPool.ref,
        roles: {
          authenticated: this.authenticatedRole.roleArn,
          unauthenticated: this.unauthenticatedRole.roleArn,
        },
      }
    );

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: "AuthUserPoolId",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: "AuthUserPoolClientId",
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: this.identityPool.ref,
      description: "Cognito Identity Pool ID",
      exportName: "AuthIdentityPoolId",
    });
  }
}
