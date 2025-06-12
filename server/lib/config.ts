import secretsManager from './secrets-manager';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

/**
 * Configuration service for the application
 * Provides a centralized way to access configuration values from
 * environment variables and AWS Secrets Manager
 */
export class ConfigService {
  private static instance: ConfigService;
  private cache: Record<string, any> = {};
  private readonly isProduction: boolean;

  // Define secret names in AWS Secrets Manager
  // Define secret paths in AWS Secrets Manager
  private readonly SECRET_PATHS = {
    GOOGLE_MAPS: 'EXTERNAL_APIS.GOOGLE_MAPS_KEY',
    FOURSQUARE: 'EXTERNAL_APIS.FOURSQUARE_API_KEY',
    SCRAPER_USER: 'SCRAPER_CONFIG.SCRAPE_OXYLABS_USER',
    SCRAPER_PASS: 'SCRAPER_CONFIG.SCRAPE_OXYLABS_PASS',
    DATABASE: 'DB_CONFIG',
  };

  // Schema for validating Google Maps API configuration
  private readonly googleMapsSchema = z.object({
    apiKey: z.string().min(1, 'Google Maps API key is required'),
  });

  // Schema for validating Foursquare API configuration
  private readonly foursquareSchema = z.object({
    apiKey: z.string().min(1, 'Foursquare API key is required'),
  });

  // Schema for validating scraper configuration
  private readonly scraperSchema = z.object({
    oxyLabsUsername: z.string().min(1, 'OxyLabs username is required'),
    oxyLabsPassword: z.string().min(1, 'OxyLabs password is required'),
  });

  // Schema for validating database configuration
  private readonly databaseSchema = z.object({
    url: z.string().min(1, 'Database URL is required'),
  });

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    console.log(`ConfigService initialized in ${this.isProduction ? 'production' : 'development'} mode`);
  }

  /**
   * Get the singleton instance of ConfigService
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Get a configuration value
   * @param key The configuration key
   * @param defaultValue The default value to return if the key is not found
   * @returns The configuration value
   */
  public get(key: string, defaultValue?: string): string {
    // Check if value is in cache
    if (this.cache[key]) {
      return this.cache[key];
    }

    // Get value from environment variables
    const value = process.env[key] || defaultValue;
    
    if (value === undefined) {
      throw new Error(`Configuration key ${key} not found and no default value provided`);
    }

    // Cache the value
    this.cache[key] = value;
    return value;
  }

  /**
   * Get a configuration value as a number
   * @param key The configuration key
   * @param defaultValue The default value to return if the key is not found
   * @returns The configuration value as a number
   */
  public getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key, defaultValue?.toString());
    const num = Number(value);
    
    if (isNaN(num)) {
      throw new Error(`Configuration key ${key} is not a valid number`);
    }
    
    return num;
  }

  /**
   * Get a configuration value as a boolean
   * @param key The configuration key
   * @param defaultValue The default value to return if the key is not found
   * @returns The configuration value as a boolean
   */
  public getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get(key, defaultValue?.toString());
    return value.toLowerCase() === 'true';
  }

  /**
   * Get Google Maps API configuration
   * @returns Google Maps API configuration
   */
  /**
   * Get Google Maps API configuration
   * @returns Google Maps API configuration
   */
  public async getGoogleMapsConfig(): Promise<{ apiKey: string }> {
    try {
      if (this.isProduction) {
        // In production, get from AWS Secrets Manager
        const apiKey = await secretsManager.getSecret(
          this.SECRET_PATHS.GOOGLE_MAPS,
          'GOOGLE_MAPS_KEY'
        );
        return this.googleMapsSchema.parse({ apiKey });
      } else {
        // In development, get from environment variables
        return this.googleMapsSchema.parse({
          apiKey: this.get('GOOGLE_MAPS_KEY'),
        });
      }
    } catch (error) {
      console.error('Error getting Google Maps configuration:', error);
      throw new Error('Failed to get Google Maps configuration');
    }
  }

  /**
   * Get Foursquare API configuration
   * @returns Foursquare API configuration
   */
  /**
   * Get Foursquare API configuration
   * @returns Foursquare API configuration
   */
  public async getFoursquareConfig(): Promise<{ apiKey: string }> {
    try {
      if (this.isProduction) {
        // In production, get from AWS Secrets Manager
        const apiKey = await secretsManager.getSecret(
          this.SECRET_PATHS.FOURSQUARE,
          'FOURSQUARE_API_KEY'
        );
        return this.foursquareSchema.parse({ apiKey });
      } else {
        // In development, get from environment variables

        return this.foursquareSchema.parse({
          apiKey: this.get('FOURSQUARE_API_KEY'),
        });
      }
    } catch (error) {
      console.error('Error getting Foursquare configuration:', error);
      throw new Error('Failed to get Foursquare configuration');
    }
  }

  /**
   * Get scraper configuration
   * @returns Scraper configuration
   */
  /**
   * Get scraper configuration
   * @returns Scraper configuration
   */
  public async getScraperConfig(): Promise<{ oxyLabsUsername: string; oxyLabsPassword: string }> {
    try {
      if (this.isProduction) {
        // In production, get from AWS Secrets Manager
        const oxyLabsUsername = await secretsManager.getSecret(
          this.SECRET_PATHS.SCRAPER_USER,
          'SCRAPE_OXYLABS_USER'
        );
        const oxyLabsPassword = await secretsManager.getSecret(
          this.SECRET_PATHS.SCRAPER_PASS,
          'SCRAPE_OXYLABS_PASS'
        );
        return this.scraperSchema.parse({ oxyLabsUsername, oxyLabsPassword });
      } else {
        // In development, get from environment variables
        return this.scraperSchema.parse({
          oxyLabsUsername: this.get('SCRAPE_OXYLABS_USER'),
          oxyLabsPassword: this.get('SCRAPE_OXYLABS_PASS'),
        });
      }
    } catch (error) {
      console.error('Error getting scraper configuration:', error);
      throw new Error('Failed to get scraper configuration');
    }
  }

  /**
   * Get database configuration
   * @returns Database configuration
   */
  /**
   * Get database configuration
   * @returns Database configuration
   */
  public async getDatabaseConfig(): Promise<{ url: string }> {
    try {
      if (this.isProduction) {
        // In production, get from AWS Secrets Manager
        const dbConfig = await secretsManager.getJSONSecret<any>(
          this.SECRET_PATHS.DATABASE
        );
        
        // Construct the database URL from the config
        const url = `postgresql://${dbConfig.DB_USER}:${dbConfig.DB_PASSWORD}@${dbConfig.DB_HOST}:${dbConfig.DB_PORT}/${dbConfig.DB_NAME}`;
        return this.databaseSchema.parse({ url });
      } else {
        // In development, get from environment variables
        return this.databaseSchema.parse({
          url: this.get('DATABASE_URL'),
        });
      }
    } catch (error) {
      console.error('Error getting database configuration:', error);
      throw new Error('Failed to get database configuration');
    }
  }

  /**
   * Get the places provider configuration
   * @returns Places provider configuration
   */
  public getPlacesProvider(): string {
    return this.get('PLACES_PROVIDER', 'hybrid');
  }

  /**
   * Clear the configuration cache
   */
  public clearCache(): void {
    this.cache = {};
    console.log('Configuration cache cleared');
  }
}

// Export singleton instance
export default ConfigService.getInstance();