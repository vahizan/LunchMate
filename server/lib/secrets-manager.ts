import { 
  SecretsManagerClient, 
  GetSecretValueCommand,
  GetSecretValueCommandInput 
} from '@aws-sdk/client-secrets-manager';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Cache for secrets to avoid repeated API calls
interface SecretCache {
  [key: string]: {
    value: string;
    timestamp: number;
  };
}

/**
 * AWS Secrets Manager Service
 * Provides functionality to fetch and cache secrets from AWS Secrets Manager
 * with fallback to environment variables for local development
 */
export class SecretsManagerService {
  private static instance: SecretsManagerService;
  private client: SecretsManagerClient;
  private secretsCache: SecretCache = {};
  private cacheTTL: number = 3600000; // 1 hour in milliseconds
  private readonly isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize AWS Secrets Manager client
    const options: any = {
      region: process.env.AWS_REGION || 'eu-west-1'
    };
    
    // In local development, use provided credentials if available
    if (!this.isProduction && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      options.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
      console.log('Using local AWS credentials for Secrets Manager');
    } else if (this.isProduction) {
      // In production, rely on IAM role credentials
      console.log('Using IAM role credentials for Secrets Manager');
    }
    
    this.client = new SecretsManagerClient(options);
  }

  /**
   * Get the singleton instance of SecretsManagerService
   */
  public static getInstance(): SecretsManagerService {
    if (!SecretsManagerService.instance) {
      SecretsManagerService.instance = new SecretsManagerService();
    }
    return SecretsManagerService.instance;
  }

  /**
   * Fetch a secret from AWS Secrets Manager
   * @param secretName The name of the secret to fetch
   * @param envFallback The environment variable to use as fallback
   * @returns The secret value
   */
  /**
   * Get the path to the secrets in AWS Secrets Manager
   * @returns The path to the secrets
   */
  private getSecretsPath(): string {
    // Use the SECRETS_PATH environment variable if available
    const secretsPath = process.env.SECRETS_PATH;
    
    if (!secretsPath) {
      // Default to environment-specific path
      const env = process.env.NODE_ENV || 'development';
      return env === 'production'
        ? 'production-findmylunch-secrets'
        : 'development-findmylunch-secrets';
    }
    
    return secretsPath;
  }

  /**
   * Fetch a secret from AWS Secrets Manager
   * @param secretName The name of the secret to fetch (can be a JSON path like 'EXTERNAL_APIS.GOOGLE_MAPS_KEY')
   * @param envFallback The environment variable to use as fallback
   * @returns The secret value
   */
  public async getSecret(secretName: string, envFallback?: string): Promise<string> {
    try {
      // In development mode, use environment variables if available
      if (!this.isProduction && envFallback && process.env[envFallback]) {
        console.log(`Using environment variable ${envFallback} for secret ${secretName}`);
        return process.env[envFallback] as string;
      }

      // Check if secret is in cache and not expired
      const cachedSecret = this.secretsCache[secretName];
      if (cachedSecret && (Date.now() - cachedSecret.timestamp) < this.cacheTTL) {
        console.log(`Using cached secret for ${secretName}`);
        return cachedSecret.value;
      }

      // Determine if this is a nested path or direct secret name
      const isNestedPath = secretName.includes('.');
      
      // If it's a nested path, get the full secret and extract the value
      if (isNestedPath) {
        const secretsPath = this.getSecretsPath();
        const fullSecret = await this.getFullSecret(secretsPath);
        
        // Parse the JSON and extract the nested value
        const secretObj = JSON.parse(fullSecret);
        const pathParts = secretName.split('.');
        
        let value = secretObj;
        for (const part of pathParts) {
          if (value === undefined || value === null) {
            throw new Error(`Path ${secretName} not found in secret ${secretsPath}`);
          }
          value = value[part];
        }
        
        if (value === undefined || value === null) {
          throw new Error(`Path ${secretName} not found in secret ${secretsPath}`);
        }
        
        // Cache the extracted value
        this.secretsCache[secretName] = {
          value: value.toString(),
          timestamp: Date.now()
        };
        
        return value.toString();
      } else {
        // Fetch direct secret from AWS Secrets Manager
        console.log(`Fetching secret ${secretName} from AWS Secrets Manager`);
        const params: GetSecretValueCommandInput = {
          SecretId: secretName
        };

        const command = new GetSecretValueCommand(params);
        const response = await this.client.send(command);
        
        if (!response.SecretString) {
          throw new Error(`Secret ${secretName} not found or has no value`);
        }

        // Cache the secret
        this.secretsCache[secretName] = {
          value: response.SecretString,
          timestamp: Date.now()
        };

        return response.SecretString;
      }
    } catch (error) {
      console.error(`Error fetching secret ${secretName}:`, error);
      
      // Fallback to environment variable if available
      if (envFallback && process.env[envFallback]) {
        console.log(`Falling back to environment variable ${envFallback}`);
        return process.env[envFallback] as string;
      }
      
      throw new Error(`Failed to retrieve secret ${secretName} and no fallback available`);
    }
  }
  
  /**
   * Get the full secret object from AWS Secrets Manager
   * @param secretId The ID of the secret to fetch
   * @returns The full secret string
   */
  private async getFullSecret(secretId: string): Promise<string> {
    // Check if the full secret is in cache
    const cacheKey = `__full_secret__${secretId}`;
    const cachedSecret = this.secretsCache[cacheKey];
    
    if (cachedSecret && (Date.now() - cachedSecret.timestamp) < this.cacheTTL) {
      console.log(`Using cached full secret for ${secretId}`);
      return cachedSecret.value;
    }
    
    // Fetch the full secret
    console.log(`Fetching full secret ${secretId} from AWS Secrets Manager`);
    const params: GetSecretValueCommandInput = {
      SecretId: secretId
    };

    const command = new GetSecretValueCommand(params);
    const response = await this.client.send(command);
    
    if (!response.SecretString) {
      throw new Error(`Secret ${secretId} not found or has no value`);
    }
    
    // Cache the full secret
    this.secretsCache[cacheKey] = {
      value: response.SecretString,
      timestamp: Date.now()
    };
    
    return response.SecretString;
  }

  /**
   * Fetch a JSON secret from AWS Secrets Manager and parse it
   * @param secretName The name of the secret to fetch
   * @param envFallback The environment variable to use as fallback
   * @returns The parsed JSON secret
   */
  /**
   * Fetch a JSON secret from AWS Secrets Manager and parse it
   * @param secretName The name of the secret to fetch
   * @param envFallback The environment variable to use as fallback
   * @returns The parsed JSON secret
   */
  public async getJSONSecret<T>(secretName: string, envFallback?: string): Promise<T> {
    // If this is a nested path, get the parent object
    if (secretName.includes('.')) {
      const pathParts = secretName.split('.');
      const parentPath = pathParts.slice(0, -1).join('.');
      
      const parentObj = await this.getJSONSecret<any>(parentPath, envFallback);
      const lastPart = pathParts[pathParts.length - 1];
      
      if (parentObj && parentObj[lastPart] !== undefined) {
        return parentObj[lastPart] as T;
      }
      
      throw new Error(`Path ${secretName} not found in secret`);
    }
    
    // Otherwise, get the full secret and parse it
    const secretString = await this.getSecret(secretName, envFallback);
    try {
      return JSON.parse(secretString) as T;
    } catch (error) {
      console.error(`Error parsing JSON secret ${secretName}:`, error);
      throw new Error(`Failed to parse JSON secret ${secretName}`);
    }
  }

  /**
   * Clear the secrets cache
   */
  public clearCache(): void {
    this.secretsCache = {};
    console.log('Secrets cache cleared');
  }

  /**
   * Set the cache TTL (time to live)
   * @param ttl Time to live in milliseconds
   */
  public setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
    console.log(`Secrets cache TTL set to ${ttl}ms`);
  }
}

export default SecretsManagerService.getInstance();