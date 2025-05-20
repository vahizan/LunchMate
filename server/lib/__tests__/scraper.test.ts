import { ScraperService, fetchCrowdLevelData, ProxyConfig } from '../scraper';
import { readFileSync } from 'fs';
import { ProxyManager } from '../proxy-manager';
import {parse} from 'node-html-parser';
import { join } from 'path';

// Mock puppeteer-extra
jest.mock('puppeteer-extra', () => {
  const mockPuppeteer = {
    use: jest.fn().mockReturnThis(),
    launch: jest.fn()
  };
  return mockPuppeteer;
});

// Mock puppeteer-extra-plugin-stealth
jest.mock('puppeteer-extra-plugin-stealth', () => {
  return jest.fn().mockImplementation(() => ({
    name: 'stealth'
  }));
});

// describe('Scraper Service', () => {
//   // Mock browser and page objects
//   const mockPage = {
//     setUserAgent: jest.fn(),
//     setViewport: jest.fn(),
//     setDefaultTimeout: jest.fn(),
//     authenticate: jest.fn(),
//     goto: jest.fn(),
//     waitForSelector: jest.fn(),
//     evaluate: jest.fn(),
//     close: jest.fn()
//   };

//   const mockBrowser = {
//     newPage: jest.fn().mockResolvedValue(mockPage),
//     close: jest.fn()
//   };

//   // Mock fetch for ProxyManager
//   global.fetch = jest.fn().mockImplementation(() =>
//     Promise.resolve({
//       ok: true,
//       status: 200,
//       statusText: 'OK',
//       json: () => Promise.resolve([
//         {
//           ip: '192.168.1.1',
//           port: 8080,
//           username: 'testuser',
//           password: 'testpass',
//           country: 'US'
//         }
//       ])
//     })
//   );

//   beforeEach(() => {
//     // Reset mocks before each test
//     jest.clearAllMocks();
    
//     // Set up default mock behavior
//     const puppeteerExtra = require('puppeteer-extra');
//     puppeteerExtra.launch.mockResolvedValue(mockBrowser);
    
//     mockPage.evaluate.mockImplementation((fn) => {
//       // Simulate different evaluate calls
//       if (fn.toString().includes('Popular times')) {
//         return true; // popularTimesExists
//       } else {
//         return {
//           crowdLevel: 'moderate',
//           crowdPercentage: 50,
//           averageTimeSpent: 'People typically spend 1-2 hours here'
//         };
//       }
//     });
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   test('ScraperService should initialize with default config', () => {
//     const scraper = new ScraperService();
//     expect(scraper).toBeDefined();
//   });

//   test('ScraperService should initialize with custom config', () => {
//     const scraper = new ScraperService({
//       headless: false,
//       timeout: 60000,
//       retryAttempts: 5
//     });
//     expect(scraper).toBeDefined();
//   });

//   test('ScraperService should initialize with proxy manager', () => {
//     const proxyManager = new ProxyManager();
//     const scraper = new ScraperService({}, proxyManager);
//     expect(scraper).toBeDefined();
//   });

//   test('extractCrowdLevelData should return crowd level data', async () => {
//     const scraper = new ScraperService();
//     const result = await scraper.extractCrowdLevelData('Test Restaurant', 'New York');
    
//     expect(result.success).toBe(true);
//     expect(result.data).toBeDefined();
//     if (result.data) {
//       expect(result.data.restaurantName).toBe('Test Restaurant');
//       expect(result.data.crowdLevel).toBe('moderate');
//       expect(result.data.crowdPercentage).toBe(50);
//     }
//   });

//   test('extractCrowdLevelData should handle errors', async () => {
//     // Set up mock to throw an error
//     mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));
    
//     const scraper = new ScraperService();
//     const result = await scraper.extractCrowdLevelData('Test Restaurant', 'New York');
    
//     expect(result.success).toBe(false);
//     expect(result.error).toBe('Navigation failed');
//   });

//   test('extractCrowdLevelData should retry on failure', async () => {
//     // First call fails, second succeeds
//     mockPage.goto
//       .mockRejectedValueOnce(new Error('Navigation failed'))
//       .mockResolvedValueOnce(undefined);
    
//     const scraper = new ScraperService({ retryAttempts: 1 });
//     const result = await scraper.extractCrowdLevelData('Test Restaurant', 'New York');
    
//     expect(mockPage.goto).toHaveBeenCalledTimes(2);
//     expect(result.success).toBe(true);
//     expect(result.retryCount).toBe(1);
//   });

//   test('closeBrowser should close the browser instance', async () => {
//     const scraper = new ScraperService();
    
//     // Initialize browser
//     await scraper.extractCrowdLevelData('Test Restaurant');
    
//     // Close browser
//     await scraper.closeBrowser();
    
//     expect(mockBrowser.close).toHaveBeenCalled();
//   });

//   test('updateConfig should update the scraper configuration', () => {
//     const scraper = new ScraperService();
    
//     scraper.updateConfig({
//       headless: false,
//       timeout: 60000
//     });
    
//     // Extract crowd data to verify config is used
//     scraper.extractCrowdLevelData('Test Restaurant');
    
//     // Verify timeout was set correctly
//     expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(60000);
//   });

//   test('setProxy should update the proxy configuration', async () => {
//     const scraper = new ScraperService();
    
//     const proxyConfig: ProxyConfig = {
//       server: 'http://test-proxy.com:8080',
//       username: 'testuser',
//       password: 'testpass'
//     };
    
//     scraper.setProxy(proxyConfig);
    
//     // Extract crowd data to verify proxy is used
//     await scraper.extractCrowdLevelData('Test Restaurant');
    
//     // Verify authenticate was called with correct credentials
//     expect(mockPage.authenticate).toHaveBeenCalledWith({
//       username: 'testuser',
//       password: 'testpass'
//     });
//   });

//   test('batchProcess should process multiple restaurants', async () => {
//     const scraper = new ScraperService();
    
//     const restaurants = ['Restaurant 1', 'Restaurant 2', 'Restaurant 3'];
//     const results = await scraper.batchProcess(restaurants, 'New York', 1);
    
//     expect(Object.keys(results)).toHaveLength(3);
//     expect(results['Restaurant 1'].success).toBe(true);
//     expect(results['Restaurant 2'].success).toBe(true);
//     expect(results['Restaurant 3'].success).toBe(true);
//   });

//   test('fetchCrowdLevelData should return crowd level data', async () => {
//     const result = await fetchCrowdLevelData('Test Restaurant', 'New York');
    
//     expect(result.success).toBe(true);
//     if (result.success && result.data) {
//       expect(result.data.restaurantName).toBe('Test Restaurant');
//       expect(result.data.crowdLevel).toBe('moderate');
//       expect(result.data.crowdPercentage).toBe(50);
//     }
//   });

//   test('fetchCrowdLevelData should use proxy manager when provided', async () => {
//     // Create a mock proxy manager
//     const mockProxyManager = {
//       initialize: jest.fn().mockResolvedValue(undefined),
//       getProxy: jest.fn().mockResolvedValue({
//         server: 'http://test-proxy.com:8080',
//         username: 'testuser',
//         password: 'testpass'
//       }),
//       reportProxySuccess: jest.fn(),
//       reportProxyFailure: jest.fn(),
//       applyRateLimit: jest.fn().mockResolvedValue(undefined),
//       shouldRotateProxy: jest.fn().mockReturnValue(false)
//     };

//     const result = await fetchCrowdLevelData(
//       'Test Restaurant',
//       'New York',
//       { timeout: 30000 },
//       mockProxyManager as unknown as ProxyManager
//     );
    
//     expect(mockProxyManager.initialize).toHaveBeenCalled();
//     expect(mockProxyManager.getProxy).toHaveBeenCalled();
//     expect(mockProxyManager.applyRateLimit).toHaveBeenCalled();
//     expect(mockProxyManager.reportProxySuccess).toHaveBeenCalled();
    
//     expect(result.success).toBe(true);
//     if (result.success && result.data) {
//       expect(result.data.restaurantName).toBe('Test Restaurant');
//       expect(result.data.crowdLevel).toBe('moderate');
//     }
//   });

//   test('fetchCrowdLevelData should handle proxy failure', async () => {
//     // Create a mock proxy manager
//     const mockProxyManager = {
//       initialize: jest.fn().mockResolvedValue(undefined),
//       getProxy: jest.fn().mockResolvedValue({
//         server: 'http://test-proxy.com:8080',
//         username: 'testuser',
//         password: 'testpass'
//       }),
//       reportProxySuccess: jest.fn(),
//       reportProxyFailure: jest.fn(),
//       applyRateLimit: jest.fn().mockResolvedValue(undefined),
//       shouldRotateProxy: jest.fn().mockReturnValue(false)
//     };

//     // Make puppeteer launch fail
//     const puppeteerExtra = require('puppeteer-extra');
//     puppeteerExtra.launch.mockRejectedValueOnce(new Error('Proxy connection failed'));

//     const result = await fetchCrowdLevelData(
//       'Test Restaurant',
//       'New York',
//       { timeout: 30000 },
//       mockProxyManager as unknown as ProxyManager
//     );
    
//     expect(result.success).toBe(false);
//     expect(result.error).toContain('Proxy connection failed');
//     expect(mockProxyManager.reportProxyFailure).toHaveBeenCalled();
//   });

//   test('extractCrowdLevelData should handle case when popular times section is not found', async () => {
//     // Mock page.evaluate to return false for popularTimesExists
//     mockPage.evaluate.mockImplementationOnce(() => false);
    
//     const scraper = new ScraperService();
//     const result = await scraper.extractCrowdLevelData('Test Restaurant');
    
//     expect(result.success).toBe(true);
//     expect(result.data?.crowdLevel).toBe('unknown');
//   });

//   test('extractCrowdLevelData should rotate proxy when threshold is reached', async () => {
//     const mockProxyManager = {
//       initialize: jest.fn().mockResolvedValue(undefined),
//       getProxy: jest.fn().mockResolvedValue({
//         server: 'http://test-proxy.com:8080',
//         username: 'testuser',
//         password: 'testpass'
//       }),
//       reportProxySuccess: jest.fn(),
//       reportProxyFailure: jest.fn(),
//       applyRateLimit: jest.fn().mockResolvedValue(undefined),
//       shouldRotateProxy: jest.fn().mockReturnValue(true)
//     };
    
//     const scraper = new ScraperService({}, mockProxyManager as unknown as ProxyManager);
//     await scraper.extractCrowdLevelData('Test Restaurant');
    
//     expect(mockProxyManager.shouldRotateProxy).toHaveBeenCalled();
//     expect(mockBrowser.close).toHaveBeenCalled();
//   });

  describe('extractCrowdDataFromPage',  () => {
    test('get crowd data from example html', async () => {
      const html = readFileSync(join(__dirname, './../../../example_scrape_data.html'), 'utf-8');
      const exampleHTML = parse(html) as unknown as HTMLElement;
      const scraper = new ScraperService();
      const result = await scraper.extractCrowdDataFromPage(exampleHTML);
      expect(result).toEqual({})
    });
  });
// });