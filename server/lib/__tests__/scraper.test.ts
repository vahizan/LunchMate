import { ScraperService, OxylabsResponse, CrowdLevelData } from '../scraper';
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { join } from 'path';
import fetch, { Response } from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

// Helper function to create a mock Response
function createMockResponse(options: {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<any>;
}): Response {
  const mockResponse = {
    ok: options.ok,
    status: options.status || (options.ok ? 200 : 500),
    statusText: options.statusText || (options.ok ? 'OK' : 'Error'),
    json: options.json || (() => Promise.resolve({})),
    text: () => Promise.resolve(''),
    buffer: () => Promise.resolve(Buffer.from('')),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    headers: {
      get: () => null,
      forEach: () => {},
      entries: () => [] as any,
      keys: () => [] as any,
      values: () => [] as any,
      has: () => false,
      raw: () => ({})
    },
    size: 0,
    timeout: 0,
    url: '',
    clone: function() { return this; },
    bodyUsed: false,
    body: null,
    textConverted: () => Promise.resolve('')
  } as unknown as Response;
  
  return mockResponse;
}


  describe('extractCrowdLevelData',  () => {
    let scraper: ScraperService;
    
    beforeEach(() => {
      // Get the singleton instance with test configuration
      scraper = ScraperService.getInstance({
        oxyLabsUsername: 'test-username',
        oxyLabsPassword: 'test-password',
        retryAttempts: 1
      });
      
      // Reset all mocks before each test
      jest.clearAllMocks();
      mockedFetch.mockReset();
    });
    
    test('should successfully extract crowd level data', async () => {
      // Mock HTML content
      const mockHtml = readFileSync(join(__dirname, './../../../example_scrape_data.html'), 'utf-8');
      
      // Mock successful Oxylabs API response
      const mockOxylabsResponse: OxylabsResponse = {
        results: [{
          content: mockHtml,
          status_code: 200,
          url: 'https://www.google.com/search?q=Test+Restaurant+popular+times'
        }],
        job_id: 'test-job-id',
        status_code: 200
      };
      
      // Mock the fetch response
      mockedFetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        json: () => Promise.resolve(mockOxylabsResponse)
      }));
      
      // Mock extractCrowdDataFromPage to return expected data
      const expectedCrowdData: CrowdLevelData = {
        restaurantName: 'Test Restaurant',
        crowdLevel: 'busy',
        averageTimeSpent: 'People typically spend up to 3 hours here',
        lastUpdated: new Date(),
        source: 'google'
      };
      
      const extractCrowdDataSpy = jest.spyOn(scraper, 'extractCrowdDataFromPage')
        .mockResolvedValueOnce(expectedCrowdData);
      
      // Call the method
      const result = await scraper.extractCrowdLevelData('Test Restaurant', 'London');
      
      // Assertions
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://realtime.oxylabs.io/v1/queries',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.any(String)
          }),
          body: expect.stringContaining('Test Restaurant London popular times')
        })
      );
      
      expect(extractCrowdDataSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        data: expectedCrowdData,
        retryCount: 0
      });
    });
    
    test('should handle API error and retry', async () => {
      // Mock failed fetch first time, successful second time
      mockedFetch.mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(createMockResponse({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              content: '<html></html>',
              status_code: 200,
              url: 'https://www.google.com/search'
            }],
            job_id: 'test-job-id',
            status_code: 200
          })
        }));
      
      // Mock extractCrowdDataFromPage to return minimal data
      const mockCrowdData: CrowdLevelData = {
        restaurantName: 'Test Restaurant',
        crowdLevel: 'unknown',
        averageTimeSpent: 'unknown',
        lastUpdated: new Date(),
        source: 'google'
      };
      
      jest.spyOn(scraper, 'extractCrowdDataFromPage')
        .mockResolvedValueOnce(mockCrowdData);
      
      // Call the method
      const result = await scraper.extractCrowdLevelData('Test Restaurant');
      
      // Assertions
      expect(mockedFetch).toHaveBeenCalledTimes(2); // Called twice due to retry
      expect(result).toEqual({
        success: true,
        data: mockCrowdData,
        retryCount: 1 // Should have retried once
      });
    });
    
    test('should handle missing Oxylabs credentials', async () => {
      // Update singleton instance with no credentials
      const noCredsScraper = ScraperService.getInstance();
      noCredsScraper.updateConfig({
        oxyLabsUsername: undefined,
        oxyLabsPassword: undefined
      });
      
      // Mock implementation to avoid actual API calls
      jest.spyOn(noCredsScraper as any, 'retry').mockImplementation(async (fn: any) => {
        try {
          await fn();
        } catch (error) {
          throw error;
        }
        return { result: undefined, retryCount: 0 };
      });
      
      // Call the method
      const result = await noCredsScraper.extractCrowdLevelData('Test Restaurant');
      
      // Assertions
      expect(mockedFetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Oxylabs credentials not configured')
      });
    }, 10000); // Increase timeout
    
    test('should handle empty results from Oxylabs', async () => {
      // Reset mocks
      mockedFetch.mockReset();
      
      // Mock empty results
      mockedFetch.mockResolvedValueOnce(createMockResponse({
        ok: true,
        json: () => Promise.resolve({
          results: [],
          job_id: 'test-job-id',
          status_code: 200
        })
      }));
      
      // Mock retry to avoid actual retries
      jest.spyOn(scraper as any, 'retry').mockImplementation(async (fn: any) => {
        try {
          const result = await fn();
          return { result, retryCount: 0 };
        } catch (error) {
          throw error;
        }
      });
      
      // Call the method
      const result = await scraper.extractCrowdLevelData('Test Restaurant');
      
      // Assertions
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('No results returned from Oxylabs API')
      });
    }, 10000); // Increase timeout
    
    test('should handle non-OK response from Oxylabs', async () => {
      // Reset mocks
      mockedFetch.mockReset();
      
      // Mock non-OK response
      mockedFetch.mockResolvedValueOnce(createMockResponse({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      }));
      
      // Mock retry to avoid actual retries
      jest.spyOn(scraper as any, 'retry').mockImplementation(async (fn: any) => {
        try {
          const result = await fn();
          return { result, retryCount: 0 };
        } catch (error) {
          throw error;
        }
      });
      
      // Call the method
      const result = await scraper.extractCrowdLevelData('Test Restaurant');
      
      // Assertions
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Oxylabs API request failed: 403 Forbidden')
      });
    }, 10000); // Increase timeout
  });

  describe('extractCrowdDataFromPage',  () => {
    beforeAll(() => {
      jest.spyOn(Date, 'now').mockImplementation(() => 1620000000000); // fixed timestamp
    });

    afterAll(() => {
      jest.restoreAllMocks(); // restore original Date.now
    });
    
    test('get crowd data from example html', async () => {
      const html = readFileSync(join(__dirname, './../../../example_scrape_data.html'), 'utf-8');
      const exampleHTML = new JSDOM(html);
      const scraper = ScraperService.getInstance();
      const result = await scraper.extractCrowdDataFromPage(exampleHTML);
      expect(result).toEqual({
        "averageTimeSpent": "People typically spend up to 3 hours here",
        "crowdLevel": "not_busy",
        "restaurantName": undefined,
        "lastUpdated": expect.any(Date),
         "source": "google",
      });
    });
  });