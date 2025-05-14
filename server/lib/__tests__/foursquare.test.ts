import { fetchRestaurants } from '../foursquare';
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
  defaultFields: ['place_id', 'name', 'rating'],
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
      is_open_now: true,
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
      results: [mockPlace]
    });
    (utils.filterResults as MockedFunction).mockReturnValue([mockPlace]);
    (utils.processPlace as MockedFunction).mockReturnValue(mockProcessedPlace);
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
        undefined
      );
      expect(utils.makeApiRequest).toHaveBeenCalled();
      expect(utils.filterResults).toHaveBeenCalledWith([mockPlace], {});
      expect(utils.processPlace).toHaveBeenCalledWith(mockPlace, ['name', 'rating'], mockLocation);
      
      expect(result).toEqual([mockProcessedPlace]);
    });

    test('should handle fsq_id only case', async () => {
      // Mock for fsq_id only case
      (utils.normalizeFieldsInput as MockedFunction).mockReturnValue(['fsq_id']);
      (utils.makeApiRequest as MockedFunction).mockResolvedValue({
        results: [{ fsq_id: 'test123' }]
      });
      (utils.filterResults as MockedFunction).mockReturnValue([{ fsq_id: 'test123' }]);
      
      const result = await fetchRestaurants(mockLocation, 1000, {}, 'fsq_id');
      
      expect(utils.buildRequestParams).toHaveBeenCalledWith(
        mockLocation,
        1000,
        {},
        'fsq_id',
        expect.any(Function),
        undefined
      );
      
      // Should not call mapToFoursquareFields for fsq_id only case
      expect(utils.mapToFoursquareFields).not.toHaveBeenCalled();
      
      // Should return just the IDs
      expect(result).toEqual([{ place_id: 'test123' }]);
    });

    test('should handle custom filters', async () => {
      await fetchRestaurants(mockLocation, 2000, mockFilters);
      
      expect(utils.buildRequestParams).toHaveBeenCalledWith(
        mockLocation,
        2000,
        mockFilters,
        'fsq_id,name,rating',
        expect.any(Function),
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
      expect(utils.processPlace).toHaveBeenCalledWith(mockPlace, customFields, mockLocation);
    });

    test('should handle API errors', async () => {
      const errorMessage = 'API error';
      (utils.makeApiRequest as MockedFunction).mockRejectedValue(new Error(errorMessage));
      
      await expect(fetchRestaurants(mockLocation)).rejects.toThrow(errorMessage);
    });

    test('should handle missing API key', async () => {
      // Mock dotenv to return no API key
      jest.requireMock('dotenv').config.mockReturnValue({
        parsed: {}
      });
      
      await expect(fetchRestaurants(mockLocation)).rejects.toThrow('Foursquare API key is missing');
    });
  });
});