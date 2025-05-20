import { config } from 'dotenv';
import fetch from 'node-fetch';
import { ProxyConfig } from './scraper';

// Load environment variables
config();

/**
 * Interface for proxy provider configuration
 */
export interface ProxyProviderConfig {
  apiKey: string;
  baseUrl: string;
  username?: string;
  password?: string;
}

/**
 * Interface for proxy details
 */
export interface ProxyDetails {
  server: string;
  username?: string;
  password?: string;
  port: number;
  country?: string;
  city?: string;
  state?: string;
  lastUsed?: Date;
  failCount: number;
  successCount: number;
  active: boolean;
}

/**
 * Interface for proxy usage statistics
 */
export interface ProxyStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}

/**
 * Proxy Manager for handling IP rotation and proxy management
 */
export class ProxyManager {
  private proxies: Map<string, ProxyDetails> = new Map();
  private proxyProvider: ProxyProviderConfig;
  private currentProxyIndex: number = 0;
  private proxyRotationThreshold: number;
  private maxFailCount: number;
  private stats: ProxyStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0
  };
  private lastProxyRefresh: Date = new Date();
  private proxyRefreshInterval: number; // in milliseconds
  private rateLimitDelay: number; // in milliseconds

  /**
   * Creates a new instance of the ProxyManager
   * @param options Configuration options for the proxy manager
   */
  constructor(options: {
    proxyProvider?: ProxyProviderConfig;
    proxyRotationThreshold?: number;
    maxFailCount?: number;
    proxyRefreshInterval?: number;
    rateLimitDelay?: number;
  } = {}) {
    // Initialize proxy provider from environment variables or options
    this.proxyProvider = options.proxyProvider || {
      apiKey: process.env.PROXY_API_KEY || '',
      baseUrl: process.env.PROXY_BASE_URL || '',
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD
    };

    // Set configuration values from options or defaults
    this.proxyRotationThreshold = options.proxyRotationThreshold || 
      parseInt(process.env.PROXY_ROTATION_THRESHOLD || '10', 10);
    
    this.maxFailCount = options.maxFailCount || 
      parseInt(process.env.PROXY_MAX_FAIL_COUNT || '3', 10);
    
    this.proxyRefreshInterval = options.proxyRefreshInterval || 
      parseInt(process.env.PROXY_REFRESH_INTERVAL || '3600000', 10); // Default: 1 hour
    
    this.rateLimitDelay = options.rateLimitDelay || 
      parseInt(process.env.PROXY_RATE_LIMIT_DELAY || '2000', 10); // Default: 2 seconds

    console.log('ProxyManager initialized with config:', {
      proxyProvider: this.proxyProvider.baseUrl ? 'Configured' : 'Not configured',
      proxyRotationThreshold: this.proxyRotationThreshold,
      maxFailCount: this.maxFailCount,
      proxyRefreshInterval: `${this.proxyRefreshInterval / 1000} seconds`,
      rateLimitDelay: `${this.rateLimitDelay} ms`
    });
  }

  /**
   * Initialize the proxy pool by fetching proxies from the provider
   */
  public async initialize(): Promise<void> {
    if (!this.proxyProvider.apiKey || !this.proxyProvider.baseUrl) {
      console.warn('Proxy provider not configured. Using direct connections.');
      return;
    }

    try {
      await this.refreshProxyPool();
      console.log(`Proxy pool initialized with ${this.proxies.size} proxies`);
    } catch (error) {
      console.error('Failed to initialize proxy pool:', error);
      throw new Error(`Proxy pool initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Refresh the proxy pool by fetching new proxies from the provider
   */
  private async refreshProxyPool(): Promise<void> {
    if (!this.proxyProvider.apiKey || !this.proxyProvider.baseUrl) {
      return;
    }

    try {
      // This is a generic implementation. Actual implementation will depend on the proxy provider's API
      const response = await fetch(`${this.proxyProvider.baseUrl}/proxies`, {
        headers: {
          'Authorization': `Bearer ${this.proxyProvider.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
        // Clear inactive proxies
        this.removeInactiveProxies();

        // Add new proxies to the pool
          data.forEach((proxy: any) => {
          const proxyDetails: ProxyDetails = {
            server: proxy.ip,
            port: proxy.port,
            username: this.proxyProvider.username || proxy.username,
            password: this.proxyProvider.password || proxy.password,
            country: proxy.country,
            city: proxy.city,
            state: proxy.state,
            failCount: 0,
            successCount: 0,
            active: true
          };

          const proxyKey = `${proxyDetails.server}:${proxyDetails.port}`;
          if (!this.proxies.has(proxyKey)) {
            this.proxies.set(proxyKey, proxyDetails);
          }
        });

          this.lastProxyRefresh = new Date();
          console.log(`Proxy pool refreshed. Total proxies: ${this.proxies.size}`);
        } else {
          throw new Error('Proxy data is not an array');
        }
      } else {
        throw new Error(`Failed to fetch proxies: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error refreshing proxy pool:', error);
      throw new Error(`Proxy pool refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove inactive proxies from the pool
   */
  private removeInactiveProxies(): void {
    // Use Array.from to convert Map entries to an array before iterating
    Array.from(this.proxies.entries()).forEach(([key, proxy]) => {
      if (!proxy.active || proxy.failCount >= this.maxFailCount) {
        this.proxies.delete(key);
      }
    });
  }

  /**
   * Get a proxy configuration for use with the scraper
   * @returns A proxy configuration object
   */
  public async getProxy(): Promise<ProxyConfig | null> {
    // Check if proxy pool needs refreshing
    const now = new Date();
    if (now.getTime() - this.lastProxyRefresh.getTime() > this.proxyRefreshInterval) {
      await this.refreshProxyPool();
    }

    // If no proxies available, return null
    if (this.proxies.size === 0) {
      console.warn('No proxies available. Using direct connection.');
      return null;
    }

    // Get all active proxies
    const activeProxies = Array.from(this.proxies.values()).filter(p => p.active);
    if (activeProxies.length === 0) {
      console.warn('No active proxies available. Using direct connection.');
      return null;
    }

    // Select a proxy using round-robin
    this.currentProxyIndex = (this.currentProxyIndex + 1) % activeProxies.length;
    const selectedProxy = activeProxies[this.currentProxyIndex];

    // Update last used timestamp
    selectedProxy.lastUsed = new Date();
    
    // Construct proxy configuration
    const proxyConfig: ProxyConfig = {
      server: `http://${selectedProxy.server}:${selectedProxy.port}`,
    };

    // Add authentication if available
    if (selectedProxy.username && selectedProxy.password) {
      proxyConfig.username = selectedProxy.username;
      proxyConfig.password = selectedProxy.password;
    }

    this.stats.totalRequests++;
    return proxyConfig;
  }

  /**
   * Report a proxy failure
   * @param proxyConfig The proxy configuration that failed
   * @param error The error that occurred
   */
  public reportProxyFailure(proxyConfig: ProxyConfig, error: Error): void {
    if (!proxyConfig || !proxyConfig.server) {
      return;
    }

    const serverParts = proxyConfig.server.replace(/^https?:\/\//, '').split(':');
    const server = serverParts[0];
    const port = parseInt(serverParts[1], 10);
    const proxyKey = `${server}:${port}`;

    const proxy = this.proxies.get(proxyKey);
    if (proxy) {
      proxy.failCount++;
      this.stats.failedRequests++;

      console.warn(`Proxy failure reported for ${proxyKey}: ${error.message}. Fail count: ${proxy.failCount}/${this.maxFailCount}`);

      // Deactivate proxy if it has failed too many times
      if (proxy.failCount >= this.maxFailCount) {
        console.warn(`Deactivating proxy ${proxyKey} due to excessive failures`);
        proxy.active = false;
      }
    }
  }

  /**
   * Report a proxy success
   * @param proxyConfig The proxy configuration that succeeded
   * @param responseTime The response time in milliseconds
   */
  public reportProxySuccess(proxyConfig: ProxyConfig, responseTime?: number): void {
    if (!proxyConfig || !proxyConfig.server) {
      return;
    }

    const serverParts = proxyConfig.server.replace(/^https?:\/\//, '').split(':');
    const server = serverParts[0];
    const port = parseInt(serverParts[1], 10);
    const proxyKey = `${server}:${port}`;

    const proxy = this.proxies.get(proxyKey);
    if (proxy) {
      proxy.successCount++;
      this.stats.successfulRequests++;

      // Reset fail count on success
      if (proxy.failCount > 0) {
        proxy.failCount = 0;
      }

      // Update average response time if provided
      if (responseTime) {
        const totalTime = this.stats.averageResponseTime * (this.stats.successfulRequests - 1);
        this.stats.averageResponseTime = (totalTime + responseTime) / this.stats.successfulRequests;
      }
    }
  }

  /**
   * Get statistics about proxy usage
   * @returns Proxy usage statistics
   */
  public getStats(): ProxyStats {
    return { ...this.stats };
  }

  /**
   * Get the current proxy pool size
   * @returns The number of proxies in the pool
   */
  public getPoolSize(): number {
    return this.proxies.size;
  }

  /**
   * Get the number of active proxies
   * @returns The number of active proxies
   */
  public getActiveProxyCount(): number {
    return Array.from(this.proxies.values()).filter(p => p.active).length;
  }

  /**
   * Wait for the rate limit delay
   * @returns A promise that resolves after the rate limit delay
   */
  public async applyRateLimit(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  /**
   * Check if proxy rotation is needed based on usage count
   * @param usageCount The number of times the current proxy has been used
   * @returns True if proxy rotation is needed, false otherwise
   */
  public shouldRotateProxy(usageCount: number): boolean {
    return usageCount >= this.proxyRotationThreshold;
  }

  /**
   * Get all proxies in the pool
   * @returns An array of proxy details
   */
  public getAllProxies(): ProxyDetails[] {
    return Array.from(this.proxies.values());
  }
}

// Export a default instance with default configuration
export const defaultProxyManager = new ProxyManager();