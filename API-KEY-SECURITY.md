# API Key Security in LunchMate

This document outlines the secure API key management system implemented in the LunchMate project. It provides an overview of the architecture, explains how API keys are stored and accessed in different environments, and includes instructions for local development setup and adding new API keys.

## Architecture Overview

The LunchMate application uses a comprehensive security system for managing API keys and other sensitive information. The system is designed with the following principles:

1. **No hardcoded secrets** - API keys and other sensitive information are never hardcoded in the application code
2. **Environment-specific management** - Different approaches for development and production environments
3. **Centralized access** - A single point of access for all configuration values
4. **Secure storage** - Production secrets stored in AWS Secrets Manager
5. **Caching mechanism** - Efficient retrieval with minimal API calls
6. **Fallback strategy** - Graceful degradation if primary source is unavailable

### Core Components

The secure API key management system consists of two main components:

1. **SecretsManagerService** (`server/lib/secrets-manager.ts`)
   - Singleton service that provides access to secrets
   - Interfaces with AWS Secrets Manager in production
   - Falls back to environment variables in development
   - Implements caching to reduce API calls
   - Supports nested JSON secrets with path-based access

2. **ConfigService** (`server/lib/config.ts`)
   - Centralized configuration service
   - Uses SecretsManagerService for sensitive information
   - Provides typed access to configuration values
   - Validates configuration using Zod schemas
   - Defines standard paths for different types of secrets

### Data Flow

The typical flow for accessing an API key is:

1. Service initialization (e.g., Google Maps service) requests configuration from ConfigService
2. ConfigService determines the environment (development or production)
3. For production, ConfigService requests the secret from SecretsManagerService
4. SecretsManagerService checks its cache for the secret
5. If not in cache, SecretsManagerService fetches from AWS Secrets Manager
6. For development, ConfigService falls back to environment variables
7. The API key is returned to the service and used for API requests

## Secret Storage

### Development Environment

In the development environment, secrets are stored in a local `.env` file at the project root. This file contains key-value pairs for all required API keys and other configuration values:

```
# Client-side API keys (prefixed with VITE_)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_FOURSQUARE_PLACES_API_KEY=your_foursquare_key
VITE_PLACES_PROVIDER=hybrid

# Server-side API keys
GOOGLE_MAPS_KEY=your_google_maps_key
FOURSQUARE_API_KEY=your_foursquare_key
PLACES_PROVIDER=hybrid

# AWS credentials for local development (optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-1
```

The `.env` file should **never** be committed to version control. It is included in `.gitignore` to prevent accidental commits.

### Production Environment

In the production environment, secrets are stored in AWS Secrets Manager. The secrets are organized in a JSON structure with nested objects for different categories:

```json
{
  "NODE_ENV": "production",
  "AWS_REGION": "eu-west-1",
  "DB_CONFIG": {
    "DB_HOST": "db-hostname",
    "DB_PORT": "5432",
    "DB_NAME": "findmylunch_prod",
    "DB_USER": "db_username",
    "DB_PASSWORD": "db_password"
  },
  "API_CONFIG": {
    "API_URL": "api.example.com",
    "API_VERSION": "v1"
  },
  "EXTERNAL_APIS": {
    "GOOGLE_MAPS_KEY": "your_google_maps_key",
    "FOURSQUARE_API_KEY": "your_foursquare_key"
  },
  "SCRAPER_CONFIG": {
    "SCRAPE_OXYLABS_USER": "scraper_username",
    "SCRAPE_OXYLABS_PASS": "scraper_password"
  }
}
```

The secrets are stored in environment-specific paths:
- Development: `development-findmylunch-secrets`
- Production: `production-findmylunch-secrets`

## Accessing API Keys in Code

API keys are accessed through the ConfigService, which provides methods for retrieving different types of configuration:

```typescript
// Example: Getting Google Maps API key
const googleMapsConfig = await config.getGoogleMapsConfig();
const apiKey = googleMapsConfig.apiKey;

// Example: Getting Foursquare API key
const foursquareConfig = await config.getFoursquareConfig();
const apiKey = foursquareConfig.apiKey;
```

The ConfigService handles the environment detection and retrieval from the appropriate source (AWS Secrets Manager or environment variables).

## CI/CD Integration

The CI/CD pipeline in GitHub Actions handles secrets management during deployment:

1. For QA deployments, it uses the `development-findmylunch-secrets` path
2. For Production deployments, it uses the `production-findmylunch-secrets` path
3. If the secret doesn't exist, it creates a new entry with a default structure
4. During deployment, it sets the `SECRETS_PATH` environment variable to point to the correct secret

## Local Development Setup

To set up the secure API key management system for local development:

1. Create a `.env` file in the project root (copy from `.env.example` if available)
2. Add your API keys and other configuration values to the `.env` file
3. For local AWS Secrets Manager testing (optional):
   - Add your AWS credentials to the `.env` file
   - Set `AWS_REGION` to your preferred region (default: `eu-west-1`)

Example `.env` file:

```
# Client-side API keys
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_FOURSQUARE_PLACES_API_KEY=your_foursquare_key
VITE_PLACES_PROVIDER=hybrid

# Server-side API keys
GOOGLE_MAPS_KEY=your_google_maps_key
FOURSQUARE_API_KEY=your_foursquare_key
PLACES_PROVIDER=hybrid

# Database configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lunchmate

# AWS credentials (optional for local AWS Secrets Manager testing)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-1
```

## Adding New API Keys or Secrets

To add a new API key or secret to the system:

### 1. Update the ConfigService

Add a new path constant and schema in `server/lib/config.ts`:

```typescript
// Add a new path constant
private readonly SECRET_PATHS = {
  // ... existing paths
  NEW_API: 'EXTERNAL_APIS.NEW_API_KEY',
};

// Add a new schema
private readonly newApiSchema = z.object({
  apiKey: z.string().min(1, 'New API key is required'),
});

// Add a new getter method
public async getNewApiConfig(): Promise<{ apiKey: string }> {
  try {
    if (this.isProduction) {
      // In production, get from AWS Secrets Manager
      const apiKey = await secretsManager.getSecret(
        this.SECRET_PATHS.NEW_API,
        'NEW_API_KEY'
      );
      return this.newApiSchema.parse({ apiKey });
    } else {
      // In development, get from environment variables
      return this.newApiSchema.parse({
        apiKey: this.get('NEW_API_KEY'),
      });
    }
  } catch (error) {
    console.error('Error getting New API configuration:', error);
    throw new Error('Failed to get New API configuration');
  }
}
```

### 2. Update Environment Files

Add the new API key to your local `.env` file:

```
NEW_API_KEY=your_new_api_key
```

### 3. Update AWS Secrets Manager (for Production)

Add the new API key to the JSON structure in AWS Secrets Manager:

```json
{
  "EXTERNAL_APIS": {
    // ... existing API keys
    "NEW_API_KEY": "your_new_api_key"
  }
}
```

This can be done manually through the AWS Console or using the AWS CLI:

```bash
aws secretsmanager update-secret --secret-id production-findmylunch-secrets --secret-string '{"EXTERNAL_APIS":{"NEW_API_KEY":"your_new_api_key"}}'
```

### 4. Use the New API Key in Your Service

Create a new service or update an existing one to use the new API key:

```typescript
import config from './config';

// API key will be loaded from config service
let apiKey = '';

// Initialize API key
(async () => {
  try {
    const newApiConfig = await config.getNewApiConfig();
    apiKey = newApiConfig.apiKey;
    console.log('New API key loaded successfully');
  } catch (error) {
    console.error('Failed to load New API key:', error);
  }
})();

// Use the API key in your service functions
export async function callNewApi() {
  // ... use apiKey for API requests
}
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Rotate API keys** regularly (especially after team member departures)
3. **Use the least privilege principle** for AWS IAM roles
4. **Monitor API key usage** for unusual patterns
5. **Implement rate limiting** to prevent abuse
6. **Use environment-specific keys** (different keys for development and production)
7. **Audit secret access** regularly through AWS CloudTrail