# CI/CD Deployment Status

This document explains the current status of the CI/CD deployment workflow for the FindMyLunch application.

## Current Status: Deployment Disabled

In the current CI/CD workflow (`.github/workflows/ci-cd.yml`), both the database and backend deployments are intentionally disabled with `if: false` conditions:

```yaml
# deploy-database job
if: false #skip db step for now

# deploy-backend job
if: false
```

## Reasons for Disabled Deployment

The deployments are currently disabled for the following reasons:

1. **Infrastructure Stabilization Phase**: 
   - The CloudFormation templates are still being refined and tested.
   - Disabling automatic deployment prevents unintended changes to the infrastructure during this phase.

2. **Manual Deployment Control**:
   - During the initial setup phase, it's safer to deploy infrastructure changes manually to ensure proper validation.
   - This allows for careful review of each deployment step and its effects.

3. **Secrets Management Setup**:
   - The proper configuration of Secrets Manager and the secure handling of database credentials is still being finalized.
   - Manual deployment ensures that sensitive information is properly managed.

## How to Deploy Currently

While the automated CI/CD deployment is disabled, you can deploy the backend using the manual process described in the `backend-deployment-guide.md`:

1. Build the application locally
2. Create an Elastic Beanstalk bundle
3. Deploy to Elastic Beanstalk using the AWS CLI

## Enabling Automated Deployment

To enable automated deployment:

1. Remove the `if: false` conditions from the `deploy-database` and `deploy-backend` jobs in `.github/workflows/ci-cd.yml`:

```yaml
# deploy-database job
# Remove or comment out this line:
# if: false #skip db step for now

# deploy-backend job
# Remove or comment out this line:
# if: false
```

2. Ensure that all prerequisites are met:
   - Proper configuration of Secrets Manager
   - Valid SSL certificates
   - Correct parameter values in backend-params.json

3. Test the workflow by triggering a manual deployment:
   - Go to the GitHub repository
   - Navigate to the "Actions" tab
   - Select the "FindMyLunch CI/CD" workflow
   - Click "Run workflow"
   - Select the appropriate environment and component
   - Click "Run workflow"

## Recommended Timeline

1. **Short-term (1-2 weeks)**:
   - Continue with manual deployments while finalizing the CloudFormation templates
   - Complete the explicit connection between backend and database stacks as described in `backend-database-connection.md`

2. **Medium-term (2-4 weeks)**:
   - Enable automated deployment for the QA environment
   - Test the full CI/CD pipeline in the QA environment

3. **Long-term (1-2 months)**:
   - Enable automated deployment for the production environment
   - Implement additional safeguards such as approval gates and rollback mechanisms