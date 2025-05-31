# GitHub Actions Workflows for LunchMate

This directory contains GitHub Actions workflow files that replace the AWS CloudFormation CI/CD setup previously defined in `cicd.yaml`.

## Workflow Files

### 1. Frontend Workflow (`frontend.yml`)

This workflow handles the CI/CD pipeline for the frontend application:

- **Triggers**: Runs on pushes/PRs to the `main` branch that affect frontend code, or manual triggers
- **Jobs**:
  - Test: Runs frontend tests
  - Build: Builds the frontend application
  - Deploy to QA: Deploys to the QA environment automatically on pushes to main
  - Approve Production Deployment: Manual approval step for production deployments
  - Deploy to Production: Deploys to production after approval

### 2. Backend Workflow (`backend.yml`)

This workflow handles the CI/CD pipeline for the backend application:

- **Triggers**: Runs on pushes/PRs to the `main` branch that affect backend code, or manual triggers
- **Jobs**:
  - Test: Runs backend tests
  - Build: Builds the backend application and creates an Elastic Beanstalk deployment package
  - Deploy to QA: Deploys to the QA environment automatically on pushes to main
  - Approve Production Deployment: Manual approval step for production deployments
  - Deploy to Production: Deploys to production after approval

## Required GitHub Secrets

You need to set up the following secrets in your GitHub repository:

### For Both Workflows

- `AWS_ACCESS_KEY_ID`: AWS access key with permissions for S3, CloudFront, and Elastic Beanstalk
- `AWS_SECRET_ACCESS_KEY`: Corresponding AWS secret key
- `AWS_REGION`: AWS region where your resources are located (e.g., `us-east-1`)
- `SLACK_WEBHOOK_URL`: (Optional) Webhook URL for Slack notifications

### For Frontend Workflow

- `S3_BUCKET_NAME`: Name of the S3 bucket for frontend deployment (different for QA and prod environments)
- `CLOUDFRONT_DISTRIBUTION_ID`: ID of the CloudFront distribution (different for QA and prod environments)

### For Backend Workflow

- `EB_APPLICATION_NAME`: Name of the Elastic Beanstalk application (different for QA and prod environments)
- `EB_ENVIRONMENT_NAME`: Name of the Elastic Beanstalk environment (different for QA and prod environments)

## Environment Setup

You need to create the following environments in your GitHub repository settings:

1. `qa`: For QA deployments
2. `prod-approval`: For the manual approval step
3. `prod`: For production deployments

For the `prod-approval` environment, enable the "Required reviewers" protection rule and add the appropriate reviewers who can approve production deployments.

## How to Use

### Automatic Deployments

- Pushing to the `main` branch will automatically trigger the workflows if the relevant files are changed
- QA deployments happen automatically after successful builds
- Production deployments require manual approval

### Manual Deployments

1. Go to the "Actions" tab in your GitHub repository
2. Select the workflow you want to run (Frontend or Backend)
3. Click "Run workflow"
4. Select the branch (usually `main`)
5. Choose the environment (`qa` or `prod`)
6. Click "Run workflow"
7. If deploying to production, approve the deployment when prompted

## Migrating from CloudFormation

This GitHub Actions setup replaces the AWS CloudFormation CI/CD infrastructure previously defined in `cicd.yaml`. The key differences are:

1. GitHub Actions manages the CI/CD pipeline instead of AWS CodePipeline
2. Workflows are defined in YAML files in the `.github/workflows` directory
3. Secrets are stored in GitHub instead of AWS Secrets Manager
4. Manual approvals are handled through GitHub Environments instead of AWS CodePipeline approval actions

The actual deployment targets (S3/CloudFront for frontend, Elastic Beanstalk for backend) remain the same.