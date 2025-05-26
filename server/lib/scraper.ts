import { config } from 'dotenv';
import fetch from 'node-fetch';
import xpath from 'xpath';
import {JSDOM} from 'jsdom';

// Load environment variables
config();

// Constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 2000; // 2 seconds

// Interfaces
export interface ScraperConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  oxyLabsUsername?: string;
  oxyLabsPassword?: string;
}

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface CrowdLevelData {
  restaurantName?: string;
  crowdLevel: 'busy' | 'moderate' | 'not_busy' | 'unknown';
  crowdPercentage?: number;
  peakHours?: Array<{
    day: string;
    hour: number;
    level: 'busy' | 'moderate' | 'not_busy';
  }>;
  averageTimeSpent: string;
  lastUpdated: Date;
  source: 'google';
}

export interface ScrapingResult {
  success: boolean;
  data?: CrowdLevelData;
  error?: string;
  retryCount?: number;
}

export interface OxylabsResponse {
  results: {
    content: string;
    status_code: number;
    url: string;
  }[];
  job_id: string;
  status_code: number;
}

/**
 * Scraper Service for extracting crowd level data from Google search results using Oxylabs API
 */
export class ScraperService {
  private config: ScraperConfig;
  private proxyUsageCount: number = 0;
  
  /**
   * Creates a new instance of the ScraperService
   * @param config Configuration options for the scraper
   */
  constructor(config: ScraperConfig = {}) {
    this.config = {
      timeout: DEFAULT_TIMEOUT,
      retryAttempts: DEFAULT_RETRY_ATTEMPTS,
      retryDelay: DEFAULT_RETRY_DELAY,
      oxyLabsUsername: process.env.OXYLABS_USERNAME,
      oxyLabsPassword: process.env.OXYLABS_PASSWORD,
      ...config
    };
    
    console.log('ScraperService initialized with config:', {
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts,
      oxyLabsConfigured: !!(this.config.oxyLabsUsername && this.config.oxyLabsPassword),
    });
  }
  
  /**
   * Retry a function with exponential backoff
   * @private
   * @param fn Function to retry
   * @param retryAttempts Maximum number of retry attempts
   * @param retryDelay Initial delay between retries (ms)
   */
  private async retry<T>(
    fn: () => Promise<T>,
    retryAttempts: number = this.config.retryAttempts || DEFAULT_RETRY_ATTEMPTS,
    retryDelay: number = this.config.retryDelay || DEFAULT_RETRY_DELAY
  ): Promise<{ result: T; retryCount: number }> {
    let lastError: Error | null = null;
    let retryCount = 0;
    
    while (retryCount <= retryAttempts) {
      try {
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount}/${retryAttempts}...`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount - 1)));
        }
        
        const result = await fn();
        return { result, retryCount };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${retryCount + 1} failed:`, lastError.message);
        retryCount++;
      }
    }
    
    throw new Error(`All ${retryAttempts} retry attempts failed. Last error: ${lastError?.message}`);
  }
  
  /**
   * Extract crowd level data from Google search results using Oxylabs API
   * @param restaurantName Name of the restaurant to search for
   * @param location Optional location to include in the search query
   */
  public async extractCrowdLevelData(
    restaurantName: string,
    location?: string
  ): Promise<ScrapingResult> {
    console.log(`Extracting crowd level data for restaurant: ${restaurantName}${location ? ` in ${location}` : ''}`);
    
    try {
      const { result: data, retryCount } = await this.retry(async () => {
        try {
          // Construct search query
          const searchQuery = `${restaurantName}${location ? ` ${location}` : ''} popular times`;
          
          // Check if Oxylabs credentials are configured
          if (!this.config.oxyLabsUsername || !this.config.oxyLabsPassword) {
            throw new Error('Oxylabs credentials not configured');
          }
          
          console.log(`Making Oxylabs API request for: ${searchQuery}`);
          
          // Make request to Oxylabs SERP API using node-fetch
          const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + Buffer.from(`${process.env.SCRAPE_OXYLABS_USER}:${process.env.SCRAPE_OXYLABS_PASS}`).toString('base64')
            },
            body: JSON.stringify({
              source: 'google_search',
              query: searchQuery,
              parse: true,
              render: 'html'
            }),
            timeout: this.config.timeout
          });
          
          // Check if the request was successful
          if (!response.ok) {
            throw new Error(`Oxylabs API request failed: ${response.status} ${response.statusText}`);
          }
          
          // Parse the response
          const responseData = await response.json() as OxylabsResponse;
          
          if (!responseData.results || responseData.results.length === 0) {
            throw new Error('No results returned from Oxylabs API');
          }
          
          // Get the HTML content from the response
          const html = responseData.results[0].content;
          const dom = new JSDOM(html)
          
          // Extract crowd level data using the existing function
          const crowdData = await this.extractCrowdDataFromPage(dom, restaurantName);
          
          return crowdData;
        } catch (error) {
          console.error('Error in Oxylabs API request:', error);
          throw error;
        }
      });
      
      return {
        success: true,
        data,
        retryCount
      };
    } catch (error) {
      console.error('Failed to extract crowd level data:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Extract crowd data from the Google search results page
   * @private
   * @param page Puppeteer Page object or mock Page object with HTML content
   * @param restaurantName Name of the restaurant
   */
  public async extractCrowdDataFromPage(dom: JSDOM, restaurantName?: string): Promise<CrowdLevelData|undefined> {
    console.log('Extracting crowd data from page...');
    
    // Default result with unknown crowd level
    const result: CrowdLevelData = {
      restaurantName,
      crowdLevel: 'unknown',
      lastUpdated: new Date(),
      source: 'google',
      averageTimeSpent: 'unknown'
    };
    
    try {
      // Check if popular times section exists
      const popularTimeXPath = "//*[contains(text(), 'Popular times')]";
      
      const popularTimeNodes = xpath.select(popularTimeXPath, dom.window.document);
      const popularTimesExists = Array.isArray(popularTimeNodes) && popularTimeNodes.length > 0;
      
      if (!popularTimesExists) {
        console.log('Popular times section not found on the page');
        return;
      }
      
      // Extract current crowd level
      const currentHour = new Date(Date.now()).getHours();
      
      // Use XPath to find current hour data
      const currentHourXPath = `//*[@data-hour="${currentHour}"]`;
      const checkedElementXPath = '//*[@aria-checked="true"]';
      
      // Try to find the current hour element or the checked element
      let currentCrowdNodes = xpath.select(currentHourXPath, dom.window.document);
      if (!Array.isArray(currentCrowdNodes) || currentCrowdNodes.length === 0) {
        currentCrowdNodes = xpath.select(checkedElementXPath, dom.window.document);
      }
      
      let crowdLevel = 'unknown';
      let crowdPercentage: number | undefined = undefined;
      
      // Extract busyness level text
      const busynessXPath = "//*[contains(text(), 'busy')]";
      const busynessNodes = xpath.select(busynessXPath, dom.window.document);
      let busynessLevel = '';
      
      if (Array.isArray(busynessNodes) && busynessNodes.length > 0) {
        // Get the first node with 'busy' text
        const busynessNode = busynessNodes[0];
        if (busynessNode && 'textContent' in busynessNode) {
          busynessLevel = busynessNode.textContent || '';
        }
      }
      
      // Determine crowd level from text
      if (busynessLevel.includes('busy')) {
        crowdLevel = 'busy';
      } else if (busynessLevel.toLowerCase().includes('not busy') || busynessLevel.toLowerCase().includes('not too busy')) {
        crowdLevel = 'not_busy';
      } else if (busynessLevel.toLowerCase().includes('usually')) {
        crowdLevel = 'moderate';
      }
      
      // If we couldn't determine from text, try to estimate from attributes
      if (crowdLevel === 'unknown' && Array.isArray(currentCrowdNodes) && currentCrowdNodes.length > 0) {        
        // Determine crowd level from percentage if available
        if (crowdLevel === 'unknown' && crowdPercentage !== undefined) {
          if (crowdPercentage >= 67) {
            crowdLevel = 'busy';
          } else if (crowdPercentage >= 33) {
            crowdLevel = 'moderate';
          } else {
            crowdLevel = 'not_busy';
          }
        }
      }
      
      // Extract average time spent
      const avgTimeSpentXpath = "//*[contains(text(), 'People typically spend')]";
      const avgTimeSpentNodes = xpath.select(avgTimeSpentXpath, dom.window.document);
      let averageTimeSpent = '';
      
      if (Array.isArray(avgTimeSpentNodes) && avgTimeSpentNodes.length > 0) {
        const avgTimeNode = avgTimeSpentNodes[0];
        if (avgTimeNode && 'textContent' in avgTimeNode) {
          averageTimeSpent = avgTimeNode.textContent || '';
        }
      }
      
      // Update result with extracted data
      console.log(`Extracted crowd level: ${crowdLevel}, percentage: ${crowdPercentage || 'N/A'}`);
      console.log(`Extracted average time spent: ${averageTimeSpent}`);
      
      return {
        restaurantName,
        crowdLevel: crowdLevel as 'busy' | 'moderate' | 'not_busy' | 'unknown',
        averageTimeSpent,
        lastUpdated: new Date(),
        source: 'google'
      };
    } catch (error) {
      console.error('Error extracting crowd data from page:', error);
      return result;
    }
  }
  
  /**
   * Batch process multiple restaurants
   * @param restaurants Array of restaurant names to process
   * @param location Optional location to include in the search query
   * @param concurrency Number of concurrent scraping operations
   */
  public async batchProcess(
    restaurants: string[],
    location?: string,
    concurrency: number = 2
  ): Promise<Record<string, ScrapingResult>> {
    console.log(`Batch processing ${restaurants.length} restaurants with concurrency ${concurrency}`);
    
    const results: Record<string, ScrapingResult> = {};
    const chunks: string[][] = [];
    
    // Split restaurants into chunks based on concurrency
    for (let i = 0; i < restaurants.length; i += concurrency) {
      chunks.push(restaurants.slice(i, i + concurrency));
    }
    
    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length}`);
      
      // Process restaurants in this chunk concurrently
      const chunkPromises = chunk.map((restaurant: string) =>
        this.extractCrowdLevelData(restaurant, location)
          .then(result => ({ restaurant, result }))
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      
      // Add results to the results object
      for (const { restaurant, result } of chunkResults) {
        results[restaurant] = result;
      }
      
      // Add a small delay between chunks to avoid rate limiting
      if (chunkIndex < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }
  
  /**
   * Update scraper configuration
   * @param newConfig New configuration options
   */
  public updateConfig(newConfig: Partial<ScraperConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    console.log('Scraper configuration updated:', {
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts,
      oxyLabsConfigured: !!(this.config.oxyLabsUsername && this.config.oxyLabsPassword)
    });
  }
}

// Export a default instance with default configuration
export const defaultScraper = new ScraperService();

/**
 * Convenience function to extract crowd level data for a restaurant
 * @param restaurantName Name of the restaurant to search for
 * @param location Optional location to include in the search query
 * @param config Optional scraper configuration
 */
export async function fetchCrowdLevelData(
  restaurantName: string,
  location?: string,
  config?: ScraperConfig,
): Promise<ScrapingResult> {
  // Create a new scraper instance with the provided config and proxy manager
  const scraper = new ScraperService(config || {});
  
  try {
    
    const result = await scraper.extractCrowdLevelData(restaurantName, location);
    
    return result;
  } catch (error) {
    console.error('Error in fetchCrowdLevelData:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}