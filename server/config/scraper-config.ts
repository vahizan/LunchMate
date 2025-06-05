/**
 * Centralized Configuration for FindMyLunch Web Scraping System
 * 
 * This module provides a centralized configuration for all components of the
 * web scraping system, including the Scraper Service, Proxy Manager, Scheduler,
 * and Crowd Data Repository.
 * 
 * Features:
 * - Loads configuration from environment variables
 * - Provides default values for all settings
 * - Validates configuration values
 * - Exports typed configuration objects for each component
 * - Supports different environments (development, testing, production)
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import { ProxyConfig } from '../lib/scraper';

// Load environment variables
dotenvConfig();

/**
 * Environment types
 */
export enum Environment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  PRODUCTION = 'production'
}

/**
 * Base configuration interface
 */
export interface BaseConfig {
  environment: Environment;
  debug: boolean;
}

/**
 * Scraper configuration interface
 */
export interface ScraperConfig {
  headless: boolean;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  userAgents: string[];
  defaultUserAgent: string;
  browserArgs: string[];
}

/**
 * Proxy Manager configuration interface
 */
export interface ProxyManagerConfig {
  enabled: boolean;
  provider: {
    apiKey: string;
    baseUrl: string;
    username?: string;
    password?: string;
  };
  rotationThreshold: number;
  maxFailCount: number;
  refreshInterval: number; // in milliseconds
  rateLimitDelay: number; // in milliseconds
}

/**
 * Scheduler configuration interface
 */
export interface SchedulerConfig {
  maxConcurrentJobs: number;
  highPriorityInterval: string; // cron format
  mediumPriorityInterval: string; // cron format
  lowPriorityInterval: string; // cron format
  popularRestaurantsInterval: string; // cron format
  maxRetries: number;
  retryDelayBase: number; // in milliseconds
  batchSize: number;
  maxProxyUsagePerBatch: number;
}

/**
 * Crowd Data Repository configuration interface
 */
export interface CrowdDataRepositoryConfig {
  databaseUrl: string;
  ttl: number; // in milliseconds
  maxHistoricalRecords: number;
  cleanupInterval: string; // cron format
}

/**
 * Complete scraping system configuration
 */
export interface ScrapingSystemConfig {
  base: BaseConfig;
  scraper: ScraperConfig;
  proxyManager: ProxyManagerConfig;
  scheduler: SchedulerConfig;
  crowdDataRepository: CrowdDataRepositoryConfig;
}

/**
 * Validation schema for base configuration
 */
const baseConfigSchema = z.object({
  environment: z.enum([
    Environment.DEVELOPMENT,
    Environment.TESTING,
    Environment.PRODUCTION
  ]).default(Environment.DEVELOPMENT),
  debug: z.boolean().default(false)
});

/**
 * Validation schema for scraper configuration
 */
const scraperConfigSchema = z.object({
  headless: z.boolean().default(true),
  timeout: z.number().int().positive().default(30000),
  retryAttempts: z.number().int().nonnegative().default(3),
  retryDelay: z.number().int().nonnegative().default(2000),
  userAgents: z.array(z.string()).min(1).default([
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
  ]),
  defaultUserAgent: z.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
  browserArgs: z.array(z.string()).default([
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
  ])
});

/**
 * Validation schema for proxy manager configuration
 */
const proxyManagerConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.object({
    apiKey: z.string().default(''),
    baseUrl: z.string().default(''),
    username: z.string().optional(),
    password: z.string().optional()
  }),
  rotationThreshold: z.number().int().positive().default(10),
  maxFailCount: z.number().int().positive().default(3),
  refreshInterval: z.number().int().positive().default(3600000), // 1 hour
  rateLimitDelay: z.number().int().nonnegative().default(2000) // 2 seconds
});

/**
 * Validation schema for scheduler configuration
 */
const schedulerConfigSchema = z.object({
  maxConcurrentJobs: z.number().int().positive().default(3),
  highPriorityInterval: z.string().default('*/5 * * * *'), // Every 5 minutes
  mediumPriorityInterval: z.string().default('*/15 * * * *'), // Every 15 minutes
  lowPriorityInterval: z.string().default('0 */1 * * *'), // Every hour
  popularRestaurantsInterval: z.string().default('0 */2 * * *'), // Every 2 hours
  maxRetries: z.number().int().nonnegative().default(3),
  retryDelayBase: z.number().int().positive().default(5000), // 5 seconds
  batchSize: z.number().int().positive().default(5),
  maxProxyUsagePerBatch: z.number().int().positive().default(10)
});

/**
 * Validation schema for crowd data repository configuration
 */
const crowdDataRepositoryConfigSchema = z.object({
  databaseUrl: z.string().default('postgresql://postgres:postgres@localhost:5432/findmylunch'),
  ttl: z.number().int().positive().default(86400000), // 24 hours
  maxHistoricalRecords: z.number().int().positive().default(100),
  cleanupInterval: z.string().default('0 0 * * *') // Daily at midnight
});

/**
 * Load and validate base configuration
 */
export function loadBaseConfig(): BaseConfig {
  const environment = process.env.NODE_ENV as Environment || Environment.DEVELOPMENT;
  const debug = process.env.DEBUG === 'true';

  return baseConfigSchema.parse({
    environment,
    debug
  });
}

/**
 * Load and validate scraper configuration
 */
export function loadScraperConfig(): ScraperConfig {
  const headless = process.env.SCRAPER_HEADLESS !== 'false';
  const timeout = parseInt(process.env.SCRAPER_TIMEOUT || '30000', 10);
  const retryAttempts = parseInt(process.env.SCRAPER_RETRY_ATTEMPTS || '3', 10);
  const retryDelay = parseInt(process.env.SCRAPER_RETRY_DELAY || '2000', 10);
  
  // Parse user agents from environment variable if provided
  let userAgents: string[] = [];
  if (process.env.SCRAPER_USER_AGENTS) {
    try {
      userAgents = JSON.parse(process.env.SCRAPER_USER_AGENTS);
    } catch (error) {
      console.warn('Failed to parse SCRAPER_USER_AGENTS, using defaults');
    }
  }
  
  const defaultUserAgent = process.env.SCRAPER_DEFAULT_USER_AGENT || '';
  
  // Parse browser args from environment variable if provided
  let browserArgs: string[] = [];
  if (process.env.SCRAPER_BROWSER_ARGS) {
    try {
      browserArgs = JSON.parse(process.env.SCRAPER_BROWSER_ARGS);
    } catch (error) {
      console.warn('Failed to parse SCRAPER_BROWSER_ARGS, using defaults');
    }
  }

  return scraperConfigSchema.parse({
    headless,
    timeout,
    retryAttempts,
    retryDelay,
    userAgents: userAgents.length > 0 ? userAgents : undefined,
    defaultUserAgent: defaultUserAgent || undefined,
    browserArgs: browserArgs.length > 0 ? browserArgs : undefined
  });
}

/**
 * Load and validate proxy manager configuration
 */
export function loadProxyManagerConfig(): ProxyManagerConfig {
  const enabled = process.env.PROXY_ENABLED === 'true';
  const apiKey = process.env.PROXY_API_KEY || '';
  const baseUrl = process.env.PROXY_BASE_URL || '';
  const username = process.env.PROXY_USERNAME;
  const password = process.env.PROXY_PASSWORD;
  const rotationThreshold = parseInt(process.env.PROXY_ROTATION_THRESHOLD || '10', 10);
  const maxFailCount = parseInt(process.env.PROXY_MAX_FAIL_COUNT || '3', 10);
  const refreshInterval = parseInt(process.env.PROXY_REFRESH_INTERVAL || '3600000', 10);
  const rateLimitDelay = parseInt(process.env.PROXY_RATE_LIMIT_DELAY || '2000', 10);

  return proxyManagerConfigSchema.parse({
    enabled,
    provider: {
      apiKey,
      baseUrl,
      username,
      password
    },
    rotationThreshold,
    maxFailCount,
    refreshInterval,
    rateLimitDelay
  });
}

/**
 * Load and validate scheduler configuration
 */
export function loadSchedulerConfig(): SchedulerConfig {
  const maxConcurrentJobs = parseInt(process.env.SCHEDULER_MAX_CONCURRENT_JOBS || '3', 10);
  const highPriorityInterval = process.env.SCHEDULER_HIGH_PRIORITY_INTERVAL || '*/5 * * * *';
  const mediumPriorityInterval = process.env.SCHEDULER_MEDIUM_PRIORITY_INTERVAL || '*/15 * * * *';
  const lowPriorityInterval = process.env.SCHEDULER_LOW_PRIORITY_INTERVAL || '0 */1 * * *';
  const popularRestaurantsInterval = process.env.SCHEDULER_POPULAR_RESTAURANTS_INTERVAL || '0 */2 * * *';
  const maxRetries = parseInt(process.env.SCHEDULER_MAX_RETRIES || '3', 10);
  const retryDelayBase = parseInt(process.env.SCHEDULER_RETRY_DELAY_BASE || '5000', 10);
  const batchSize = parseInt(process.env.SCHEDULER_BATCH_SIZE || '5', 10);
  const maxProxyUsagePerBatch = parseInt(process.env.SCHEDULER_MAX_PROXY_USAGE_PER_BATCH || '10', 10);

  return schedulerConfigSchema.parse({
    maxConcurrentJobs,
    highPriorityInterval,
    mediumPriorityInterval,
    lowPriorityInterval,
    popularRestaurantsInterval,
    maxRetries,
    retryDelayBase,
    batchSize,
    maxProxyUsagePerBatch
  });
}

/**
 * Load and validate crowd data repository configuration
 */
export function loadCrowdDataRepositoryConfig(): CrowdDataRepositoryConfig {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/findmylunch';
  const ttl = parseInt(process.env.CROWD_DATA_TTL || '86400000', 10);
  const maxHistoricalRecords = parseInt(process.env.CROWD_DATA_MAX_HISTORICAL_RECORDS || '100', 10);
  const cleanupInterval = process.env.CROWD_DATA_CLEANUP_INTERVAL || '0 0 * * *';

  return crowdDataRepositoryConfigSchema.parse({
    databaseUrl,
    ttl,
    maxHistoricalRecords,
    cleanupInterval
  });
}

/**
 * Load and validate the complete scraping system configuration
 */
export function loadScrapingSystemConfig(): ScrapingSystemConfig {
  return {
    base: loadBaseConfig(),
    scraper: loadScraperConfig(),
    proxyManager: loadProxyManagerConfig(),
    scheduler: loadSchedulerConfig(),
    crowdDataRepository: loadCrowdDataRepositoryConfig()
  };
}

/**
 * Get a proxy configuration from the proxy manager configuration
 * @param config Proxy manager configuration
 * @returns Proxy configuration or null if proxies are disabled
 */
export function getProxyConfig(config: ProxyManagerConfig): ProxyConfig | null {
  if (!config.enabled || !config.provider.apiKey || !config.provider.baseUrl) {
    return null;
  }

  return {
    server: config.provider.baseUrl,
    username: config.provider.username,
    password: config.provider.password
  };
}

/**
 * Apply environment-specific overrides to the configuration
 * @param config The configuration to modify
 * @param environment The target environment
 * @returns The modified configuration
 */
export function applyEnvironmentOverrides(
  config: ScrapingSystemConfig,
  environment: Environment = config.base.environment
): ScrapingSystemConfig {
  const modifiedConfig = { ...config };

  switch (environment) {
    case Environment.DEVELOPMENT:
      // Development-specific overrides
      modifiedConfig.scraper.headless = false; // Show browser in development
      modifiedConfig.base.debug = true; // Enable debug mode
      break;

    case Environment.TESTING:
      // Testing-specific overrides
      modifiedConfig.scraper.headless = true; // Headless in testing
      modifiedConfig.proxyManager.enabled = false; // Disable proxies in testing
      modifiedConfig.scheduler.maxConcurrentJobs = 1; // Limit concurrency in testing
      break;

    case Environment.PRODUCTION:
      // Production-specific overrides
      modifiedConfig.scraper.headless = true; // Always headless in production
      modifiedConfig.base.debug = false; // Disable debug mode
      break;
  }

  return modifiedConfig;
}

/**
 * Validate the complete configuration
 * @param config The configuration to validate
 * @returns True if the configuration is valid, throws an error otherwise
 */
export function validateConfig(config: ScrapingSystemConfig): boolean {
  // Validate base config
  baseConfigSchema.parse(config.base);
  
  // Validate scraper config
  scraperConfigSchema.parse(config.scraper);
  
  // Validate proxy manager config
  proxyManagerConfigSchema.parse(config.proxyManager);
  
  // Validate scheduler config
  schedulerConfigSchema.parse(config.scheduler);
  
  // Validate crowd data repository config
  crowdDataRepositoryConfigSchema.parse(config.crowdDataRepository);
  
  // Additional cross-component validation
  if (config.proxyManager.enabled && (!config.proxyManager.provider.apiKey || !config.proxyManager.provider.baseUrl)) {
    throw new Error('Proxy manager is enabled but API key or base URL is missing');
  }
  
  if (config.scheduler.maxConcurrentJobs > 10) {
    console.warn('High concurrency detected. This may cause performance issues.');
  }
  
  return true;
}

// Export the default configuration
export const defaultConfig = loadScrapingSystemConfig();

// Export the validated and environment-adjusted configuration
export const scrapingConfig = applyEnvironmentOverrides(defaultConfig);

// Validate the configuration
validateConfig(scrapingConfig);

// Export individual component configurations for direct use
export const baseConfig = scrapingConfig.base;
export const scraperConfig = scrapingConfig.scraper;
export const proxyManagerConfig = scrapingConfig.proxyManager;
export const schedulerConfig = scrapingConfig.scheduler;
export const crowdDataRepositoryConfig = scrapingConfig.crowdDataRepository;