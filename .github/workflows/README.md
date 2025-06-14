# FindMyLunch CI/CD Workflow

This directory contains the CI/CD workflow configuration for the FindMyLunch application. The workflow is designed to automate testing, building, and deploying both frontend and backend components to multiple environments.

## Workflow Overview

The CI/CD pipeline is defined in a single unified workflow file (`ci-cd.yml`) that handles:

1. **Testing**: Runs tests for both frontend and backend components
2. **Building**: Builds the application components and creates deployment artifacts
3. **Infrastructure Deployment**: Uses CloudFormation templates to provision and update AWS resources
4. **Application Deployment**: Deploys the application to the appropriate environment (QA or Production)

## Deployment Environments

The workflow supports two deployment environments:

- **QA Environment**: Automatically deployed on pushes to the main branch
- **Production Environment**: Requires manual approval via GitHub environment protection rules

## CloudFormation Infrastructure

The application infrastructure is managed using AWS CloudFormation with a nested template structure:

- `master.yaml`: Main template that orchestrates the entire stack
- `frontend.yaml`: Frontend resources (S3, CloudFront, etc.)
- `backend.yaml`: Backend resources (Elastic Beanstalk, etc.)
- `networking.yaml`: Network infrastructure (VPC, subnets, etc.)
- `database.yaml`: Database resources

Environment-specific parameters are defined in:
- `qa-parameters.json`: Parameters for the QA environment
- `prod-parameters.json`: Parameters for the Production environment

## Triggering Deployments

The workflow can be triggered in several ways:

### Automatic Triggers

- **Push to main branch**: Automatically runs tests and deploys to QA
- **Pull Request to main branch**: Runs tests only (no deployment)

### Manual Triggers

Use the GitHub Actions workflow dispatch with the following options:

1. **Environment**:
   - `qa`: Deploy to QA environment
   - `prod`: Deploy to Production environment (requires approval)

2. **Component**:
   - `all`: Deploy both frontend and backend components
   - `frontend`: Deploy only the frontend component
   - `backend`: Deploy only the backend component

## Example Usage

To manually trigger a deployment to QA for the frontend only:
1. Go to the Actions tab in GitHub
2. Select the "FindMyLunch CI/CD" workflow
3. Click "Run workflow"
4. Select "qa" for environment and "frontend" for component
5. Click "Run workflow"

## Workflow Maintenance

When making changes to the workflow:

1. Test changes in the QA environment first
2. Ensure all required secrets are configured in the GitHub repository settings
3. Update this documentation if the workflow behavior changes