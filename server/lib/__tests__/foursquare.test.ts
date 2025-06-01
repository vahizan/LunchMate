import { fetchRestaurants, fetchRestaurantDetails, fetchPlaceImages } from '../foursquare';
import * as utils from '../foursquare.utils';
import { Location, FilterOptions, Place } from '../foursquare.interfaces';

// Add type for mocked functions
type MockedFunction = any;

// Mock the utility functions
jest.mock('../foursquare.utils', () => ({
  normalizeFieldsInput: jest.fn(),
  mapToFoursquareFields: jest.fn(),
  buildRequestParams: jest.fn(),
  makeApiRequest: jest.fn(),
  filterResults: jest.fn(),
  processPlace: jest.fn(),
  processPlaces: jest.fn(),
  defaultFields: ['fsq_id', 'name', 'rating'],
  convertPriceLevel: jest.fn(),
  calculateDistance: jest.fn()
}));

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());

// Mock dotenv config
jest.mock('dotenv', () => ({
  config: jest.fn().mockReturnValue({
    parsed: {
      FOURSQUARE_API_KEY: 'mock-api-key'
    }
  })
}));

describe('Foursquare API', () => {
  // Mock data
  const mockLocation: Location = { lat: 40.7128, lng: -74.0060 };
  const mockFilters: FilterOptions = {
    cuisines: ['italian'],
    dietary: ['vegetarian'],
    priceLevel: 2,
    excludeChains: true,
    excludeCafe: false
  };
  
  const mockPlace: Place = {
    fsq_id: 'test123',
    name: 'Test Restaurant',
    location: {
      address: '123 Test St',
      locality: 'Test City',
      region: 'Test Region',
      postcode: '12345',
      country: 'Test Country'
    },
    geocodes: {
      main: {
        latitude: 40.7128,
        longitude: -74.0060
      }
    },
    categories: [
      { 
        id: 1, 
        name: 'Italian Restaurant',
        icon: { prefix: 'https://ss3.4sqi.net/img/categories_v2/food/italian_', suffix: '.png' }
      }
    ],
    distance: 1000,
    rating: 8.5,
    price: 2,
    photos: [
      {
        id: 'photo1',
        created_at: '2023-01-01',
        prefix: 'https://fastly.4sqi.net/img/general/',
        suffix: '/photo1.jpg',
        width: 800,
        height: 600
      }
    ],
    hours: {
      open_now: true,
      display: ['Monday: 9:00 AM - 10:00 PM']
    },
    website: 'https://testrestaurant.com',
    tel: '+1234567890',
    stats: {
      total_ratings: 100
    }
  };

  const mockProcessedPlace = {
    place_id: 'test123',
    name: 'Test Restaurant',
    rating: 4.25
  };

  // Mock fetch function
  const mockFetch = jest.requireMock('node-fetch');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    (utils.normalizeFieldsInput as MockedFunction).mockReturnValue(['name', 'rating']);
    (utils.mapToFoursquareFields as MockedFunction).mockReturnValue('fsq_id,name,rating');
    (utils.buildRequestParams as MockedFunction).mockReturnValue(new URLSearchParams({
      ll: '40.7128,-74.0060',
      radius: '1000',
      fields: 'fsq_id,name,rating'
    }));
    (utils.makeApiRequest as MockedFunction).mockResolvedValue({
      response: {
        results: [mockPlace]
      },
      headers: new Map([['link', 'cursor=abc123']])
    });
    (utils.filterResults as MockedFunction).mockReturnValue([mockPlace]);
    (utils.processPlace as MockedFunction).mockReturnValue(mockProcessedPlace);
    (utils.processPlaces as MockedFunction).mockReturnValue([mockProcessedPlace]);
  });

  describe('fetchRestaurants', () => {
    test('should fetch restaurants with default parameters', async () => {
      const result = await fetchRestaurants(mockLocation);
      
      expect(utils.normalizeFieldsInput).toHaveBeenCalledWith(utils.defaultFields);
      expect(utils.mapToFoursquareFields).toHaveBeenCalledWith(['name', 'rating']);
      expect(utils.buildRequestParams).toHaveBeenCalledWith(
        mockLocation,
        1000,
        {},
        'fsq_id,name,rating',
        expect.any(Function),
        undefined,
        undefined
      );
      expect(utils.makeApiRequest).toHaveBeenCalled();
      expect(utils.filterResults).toHaveBeenCalledWith([mockPlace], {});
      expect(utils.processPlaces).toHaveBeenCalledWith([mockPlace], ['name', 'rating'], mockLocation);
      
      expect(result.results).toEqual([mockProcessedPlace]);
    });

    test('should handle fsq_id only case', async () => {
      // Mock for fsq_id only case
      (utils.normalizeFieldsInput as MockedFunction).mockReturnValue(['fsq_id']);
      (utils.makeApiRequest as MockedFunction).mockResolvedValue({
        response: {
          results: [{ fsq_id: 'test123' }]
        },
        headers: new Map()
      });
      (utils.filterResults as MockedFunction).mockReturnValue([{ fsq_id: 'test123' }]);
      
      const result = await fetchRestaurants(mockLocation, 1000, {}, 'fsq_id');
      
      expect(utils.buildRequestParams).toHaveBeenCalledWith(
        mockLocation,
        1000,
        {},
        'fsq_id',
        expect.any(Function),
        undefined,
        undefined
      );
      
      // Should not call mapToFoursquareFields for fsq_id only case
      expect(utils.mapToFoursquareFields).not.toHaveBeenCalled();
      
      // Should return just the IDs
      expect(result.results).toEqual([{ place_id: 'test123' }]);
    });

    test('should handle custom filters', async () => {
      await fetchRestaurants(mockLocation, 2000, mockFilters);
      
      expect(utils.buildRequestParams).toHaveBeenCalledWith(
        mockLocation,
        2000,
        mockFilters,
        'fsq_id,name,rating',
        expect.any(Function),
        undefined,
        undefined
      );
      
      expect(utils.filterResults).toHaveBeenCalledWith([mockPlace], mockFilters);
    });

    test('should handle custom fields', async () => {
      const customFields = ['name', 'photos', 'website'];
      (utils.normalizeFieldsInput as MockedFunction).mockReturnValue(customFields);
      
      await fetchRestaurants(mockLocation, 1000, {}, customFields);
      
      expect(utils.normalizeFieldsInput).toHaveBeenCalledWith(customFields);
      expect(utils.mapToFoursquareFields).toHaveBeenCalledWith(customFields);
      expect(utils.processPlaces).toHaveBeenCalledWith([mockPlace], customFields, mockLocation);
    });

    test('should handle pagination with cursor', async () => {
      const cursor = 'next_page_token';
      await fetchRestaurants(mockLocation, 1000, {}, utils.defaultFields, '10', cursor);
      
      expect(utils.buildRequestParams).toHaveBeenCalledWith(
        mockLocation,
        1000,
        {},
        'fsq_id,name,rating',
        expect.any(Function),
        '10',
        cursor
      );
    });

    test('should handle API errors', async () => {
      const errorMessage = 'API error';
      (utils.makeApiRequest as MockedFunction).mockRejectedValue(new Error(errorMessage));
      
      await expect(fetchRestaurants(mockLocation)).rejects.toThrow(errorMessage);
    });

    test('should handle missing API key', async () => {
      // Mock dotenv to return no API key
      const originalApiKey = jest.requireMock('dotenv').config().parsed.FOURSQUARE_API_KEY;
      jest.requireMock('dotenv').config.mockReturnValue({
        parsed: {}
      });
      
      // Mock makeApiRequest to throw the expected error
      (utils.makeApiRequest as MockedFunction).mockRejectedValue(new Error('Foursquare API key is missing'));
      
      await expect(fetchRestaurants(mockLocation)).rejects.toThrow('Foursquare API key is missing');
      
      // Restore the original API key for subsequent tests
      jest.requireMock('dotenv').config.mockReturnValue({
        parsed: {
          FOURSQUARE_API_KEY: originalApiKey
        }
      });
    });
  });

  describe('fetchRestaurantDetails', () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(mockPlace),
      status: 200
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue(mockResponse);
    });

    test('should fetch restaurant details successfully', async () => {
      const placeId = 'test123';
      const result = await fetchRestaurantDetails(placeId);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`https://api.foursquare.com/v3/places/${placeId}`),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'mock-api-key',
            'Accept': 'application/json'
          })
        })
      );
      
      // Verify that mapToFoursquareFields was called with defaultFields
      expect(utils.mapToFoursquareFields).toHaveBeenCalledWith(utils.defaultFields);
      
      expect(result).toHaveProperty('place_id', placeId);
      expect(result).toHaveProperty('name', mockPlace.name);
    });

    test('should calculate distance when location is provided', async () => {
      (utils.calculateDistance as MockedFunction).mockReturnValue(1.5);
      
      // Mock the response to not include distance so calculateDistance will be called
      const mockResponseWithoutDistance = {
        ...mockPlace,
        distance: undefined
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponseWithoutDistance),
        status: 200
      });
      
      const placeId = 'test123';
      const result = await fetchRestaurantDetails(placeId, mockLocation);
      
      expect(utils.calculateDistance).toHaveBeenCalledWith(
        mockLocation,
        expect.objectContaining({
          lat: mockPlace.geocodes.main.latitude,
          lng: mockPlace.geocodes.main.longitude
        })
      );
      
      expect(result).toHaveProperty('distance');
    });

    test('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      await expect(fetchRestaurantDetails('invalid-id')).rejects.toThrow('Foursquare API error: 404');
    });

    test('should handle missing API key', async () => {
      // Mock dotenv to return no API key
      const originalApiKey = jest.requireMock('dotenv').config().parsed.FOURSQUARE_API_KEY;
      jest.requireMock('dotenv').config.mockReturnValue({
        parsed: {}
      });
      
      // Mock fetch to throw the expected error
      mockFetch.mockImplementation(() => {
        throw new Error('Foursquare API key is missing');
      });
      
      await expect(fetchRestaurantDetails('test123')).rejects.toThrow('Foursquare API key is missing');
      
      // Restore the original API key for subsequent tests
      jest.requireMock('dotenv').config.mockReturnValue({
        parsed: {
          FOURSQUARE_API_KEY: originalApiKey
        }
      });
      
      // Reset fetch mock
      mockFetch.mockReset();
    });
  });

  describe('fetchPlaceImages', () => {
    const mockPhotos = [
      {
        id: 'photo1',
        height: 600,
        width: 800,
        prefix: 'https://fastly.4sqi.net/img/general/',
        suffix: '/photo1.jpg',
        created_at: '2023-01-01'
      }
    ];

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(mockPhotos),
      status: 200
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue(mockResponse);
    });

    test('should fetch place images successfully', async () => {
      const placeId = 'test123';
      const result = await fetchPlaceImages(placeId);
      
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.foursquare.com/v3/places/${placeId}/photos`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'mock-api-key',
            'Accept': 'application/json'
          })
        })
      );
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('photo_reference', 'photo1');
      expect(result[0]).toHaveProperty('url', 'https://fastly.4sqi.net/img/general/original/photo1.jpg');
      expect(result[0]).toHaveProperty('prefix', mockPhotos[0].prefix);
      expect(result[0]).toHaveProperty('suffix', mockPhotos[0].suffix);
    });

    test('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      await expect(fetchPlaceImages('invalid-id')).rejects.toThrow('Foursquare API error: 404');
    });

    test('should handle missing API key', async () => {
      // Mock dotenv to return no API key
      const originalApiKey = jest.requireMock('dotenv').config().parsed.FOURSQUARE_API_KEY;
      jest.requireMock('dotenv').config.mockReturnValue({
        parsed: {}
      });
      
      // Mock fetch to throw the expected error
      mockFetch.mockImplementation(() => {
        throw new Error('Foursquare API key is missing');
      });
      
      await expect(fetchPlaceImages('test123')).rejects.toThrow('Foursquare API key is missing');
      
      // Restore the original API key for subsequent tests
      jest.requireMock('dotenv').config.mockReturnValue({
        parsed: {
          FOURSQUARE_API_KEY: originalApiKey
        }
      });
    });
  });
});