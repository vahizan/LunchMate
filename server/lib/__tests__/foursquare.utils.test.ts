import {
  normalizeFieldsInput,
  mapToFoursquareFields,
  buildRequestParams,
  filterResults,
  processPlace,
  calculateDistance,
  toRad,
  convertPriceLevel,
  fieldMappings
} from '../foursquare.utils';
import { FilterOptions, Place } from '../foursquare.interfaces';

// Mock data
const mockLocation = { lat: 40.7128, lng: -74.0060 }; // New York
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
    },
    {
      id: 2,
      name: 'Pizza Place',
      icon: { prefix: 'https://ss3.4sqi.net/img/categories_v2/food/pizza_', suffix: '.png' }
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

// Mock buildCategoriesString function
const mockBuildCategoriesString = (filters: FilterOptions) => {
  return 'mock-categories';
};

describe('Foursquare Utils', () => {
  describe('normalizeFieldsInput', () => {
    test('should convert string to array', () => {
      const input = 'field1,field2,field3';
      const result = normalizeFieldsInput(input);
      expect(result).toEqual(['field1', 'field2', 'field3']);
    });

    test('should return array as is', () => {
      const input = ['field1', 'field2', 'field3'];
      const result = normalizeFieldsInput(input);
      expect(result).toEqual(input);
    });
  });

  describe('mapToFoursquareFields', () => {
    test('should map fields to Foursquare fields', () => {
      const input = ['name', 'formatted_address', 'rating'];
      const result = mapToFoursquareFields(input);
      expect(result).toContain('fsq_id'); // Always included
      expect(result).toContain('name');
      expect(result).toContain('location');
      expect(result).toContain('rating');
    });

    test('should handle direct Foursquare fields', () => {
      const input = ['fsq_id', 'custom_field_name'];
      const result = mapToFoursquareFields(input);
      expect(result).toContain('fsq_id');
      expect(result).toContain('custom_field_name');
    });

    test('should always include fsq_id', () => {
      const input: string[] = [];
      const result = mapToFoursquareFields(input);
      expect(result).toBe('fsq_id');
    });
  });

  describe('buildRequestParams', () => {
    test('should build basic params correctly', () => {
      const result = buildRequestParams(
        mockLocation,
        1000,
        {},
        'fsq_id,name',
        mockBuildCategoriesString
      );
      
      expect(result.get('ll')).toBe(`${mockLocation.lat},${mockLocation.lng}`);
      expect(result.get('radius')).toBe('1000');
      expect(result.get('sort')).toBe('distance');
      expect(result.get('fields')).toBe('fsq_id,name');
    });

    test('should include limit if provided', () => {
      const result = buildRequestParams(
        mockLocation,
        1000,
        {},
        'fsq_id',
        mockBuildCategoriesString,
        50
      );
      
      expect(result.get('limit')).toBe('50');
    });

    test('should include categories if available', () => {
      const result = buildRequestParams(
        mockLocation,
        1000,
        mockFilters,
        'fsq_id',
        mockBuildCategoriesString
      );
      
      expect(result.get('categories')).toBe('mock-categories');
    });

    test('should include price level if specified', () => {
      const result = buildRequestParams(
        mockLocation,
        1000,
        { priceLevel: 3 },
        'fsq_id',
        mockBuildCategoriesString
      );
      
      expect(result.get('min_price')).toBe('2');
      expect(result.get('max_price')).toBe('3');
    });
  });

  describe('filterResults', () => {
    test('should filter out chain restaurants if requested', () => {
      const results = [
        { fsq_id: '1', chains: [{ id: 'chain1' }] },
        { fsq_id: '2', chains: [] },
        { fsq_id: '3' }
      ] as Place[];
      
      const filtered = filterResults(results, { excludeChains: true });
      expect(filtered.length).toBe(2);
      expect(filtered.map(r => r.fsq_id)).toEqual(['2', '3']);
    });

    test('should not filter if excludeChains is false', () => {
      const results = [
        { fsq_id: '1', chains: [{ id: 'chain1' }] },
        { fsq_id: '2', chains: [] },
        { fsq_id: '3' }
      ] as Place[];
      
      const filtered = filterResults(results, { excludeChains: false });
      expect(filtered.length).toBe(3);
    });
  });

  describe('processPlace', () => {
    test('should process place with all fields', () => {
      const fieldsArray = Object.keys(fieldMappings);
      const result = processPlace(mockPlace, fieldsArray, mockLocation);
      
      expect(result.place_id).toBe(mockPlace.fsq_id);
      expect(result.name).toBe(mockPlace.name);
      expect(result.formatted_address).toContain(mockPlace.location.address);
      expect(result.rating).toBe(mockPlace.rating! / 2);
      expect(result.types).toEqual(['italian restaurant', 'pizza place']);
      expect(result.photos).toHaveLength(1);
      expect(result.opening_hours.open_now).toBe(true);
      expect(result.geometry.location).toEqual({
        lat: mockPlace.geocodes.main.latitude,
        lng: mockPlace.geocodes.main.longitude
      });
      expect(result.formatted_phone_number).toBe(mockPlace.tel);
      expect(result.website).toBe(mockPlace.website);
    });

    test('should only include requested fields', () => {
      const fieldsArray = ['name', 'rating'];
      const result = processPlace(mockPlace, fieldsArray, mockLocation);
      
      expect(result.place_id).toBe(mockPlace.fsq_id); // Always included
      expect(result.name).toBe(mockPlace.name);
      expect(result.rating).toBe(mockPlace.rating! / 2);
      expect(result.formatted_address).toBeUndefined();
      expect(result.types).toBeUndefined();
      expect(result.photos).toBeUndefined();
    });

    test('should handle missing fields gracefully', () => {
      const incompletePlace = {
        fsq_id: 'test456',
        name: 'Incomplete Place'
      } as Place;
      
      const fieldsArray = ['name', 'rating', 'photos', 'website'];
      const result = processPlace(incompletePlace, fieldsArray, mockLocation);
      
      expect(result.place_id).toBe(incompletePlace.fsq_id);
      expect(result.name).toBe(incompletePlace.name);
      expect(result.rating).toBeUndefined();
      expect(result.photos).toBeUndefined();
      expect(result.website).toBeUndefined();
    });
  });

  describe('calculateDistance', () => {
    test('should calculate distance between two points', () => {
      const location1 = { lat: 40.7128, lng: -74.0060 }; // New York
      const location2 = { lat: 34.0522, lng: -118.2437 }; // Los Angeles
      const distance = calculateDistance(location1, location2);
      
      // Approximate distance between NY and LA is about 3,944 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    test('should return 0 for same location', () => {
      const location = { lat: 40.7128, lng: -74.0060 };
      const distance = calculateDistance(location, location);
      expect(distance).toBeCloseTo(0);
    });
  });

  describe('toRad', () => {
    test('should convert degrees to radians', () => {
      expect(toRad(180)).toBeCloseTo(Math.PI);
      expect(toRad(90)).toBeCloseTo(Math.PI / 2);
      expect(toRad(0)).toBeCloseTo(0);
    });
  });

  describe('convertPriceLevel', () => {
    test('should convert Foursquare price level to Google price level', () => {
      expect(convertPriceLevel(1)).toBe(1);
      expect(convertPriceLevel(2)).toBe(2);
      expect(convertPriceLevel(3)).toBe(3);
      expect(convertPriceLevel(4)).toBe(4);
      expect(convertPriceLevel(5)).toBe(4); // Max is 4
    });
  });
});