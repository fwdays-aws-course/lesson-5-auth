# Infrastructure (AWS CDK)

CDK app that provisions:

- Frontend: S3 bucket + CloudFront distribution, plus deployment of `front-end/build/client` assets
- Cognito: user pool + user pool client + identity pool (domain / Google IdP are configured manually — see `../SETUP.md`)
- Backend: ECR repository + App Runner service that **auto-deploys** on new `:latest` image pushes

## Useful commands

- `npm run build`: compile TypeScript
- `npm run watch`: watch + compile
- `npm test`: run unit tests
- `npx cdk diff`: show planned changes
- `npx cdk synth`: synthesize CloudFormation
- `npx cdk deploy InfrastructureStack --require-approval never`: deploy

## CI/CD note

GitHub Actions builds the frontend first, then runs `cdk deploy` so CDK can upload the built assets via `BucketDeployment`. After deploy, CI uploads `config.js` (runtime config) to the frontend bucket and updates Cognito callback/logout URLs.

## Cognito deployment stability (important)

CloudFormation cannot update some Cognito User Pool properties (notably **AliasAttributes / UsernameAttributes**).
If your User Pool was created with one set of sign-in options, later `cdk deploy` runs can get stuck forever when
CDK/CFN attempts to change them.

To avoid blocked deployments, the CDK app supports **external Cognito mode**. If the following env vars are set,
CDK will **not** create/manage Cognito resources and will instead use the provided IDs:

- `EXISTING_USER_POOL_ID`
- `EXISTING_USER_POOL_CLIENT_ID`
- `EXISTING_IDENTITY_POOL_ID`

This is the recommended mode for long-lived environments where Cognito is treated as “one-time provisioned / manually managed”.