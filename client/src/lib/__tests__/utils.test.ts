import { areFiltersEqual, areLocationsEqual } from '../utils';
import { Filters, Location } from '../../types';

describe('areFiltersEqual', () => {
  test('returns true when both filters are undefined', () => {
    expect(areFiltersEqual(undefined, undefined)).toBe(true);
  });

  test('returns false when only one filter is undefined', () => {
    const filters: Filters = {
      radius: [0.5],
      cuisines: [],
      dietary: [],
      priceLevel: 2,
      historyDays: 14,
      excludeChains: false,
      excludeCafe: false,
      departureTime: "12:00"
    };
    expect(areFiltersEqual(filters, undefined)).toBe(false);
    expect(areFiltersEqual(undefined, filters)).toBe(false);
  });

  test('returns false when primitive properties are different', () => {
    const filters1: Filters = {
      radius: [0.5],
      cuisines: [],
      dietary: [],
      priceLevel: 2,
      historyDays: 14,
      excludeChains: false,
      excludeCafe: false,
      departureTime: "12:00"
    };
    
    // Different priceLevel
    const filters2: Filters = {
      ...filters1,
      priceLevel: 3
    };
    expect(areFiltersEqual(filters1, filters2)).toBe(false);
    
    // Different historyDays
    const filters3: Filters = {
      ...filters1,
      historyDays: 7
    };
    expect(areFiltersEqual(filters1, filters3)).toBe(false);
    
    // Different excludeChains
    const filters4: Filters = {
      ...filters1,
      excludeChains: true
    };
    expect(areFiltersEqual(filters1, filters4)).toBe(false);
    
    // Different excludeCafe
    const filters5: Filters = {
      ...filters1,
      excludeCafe: true
    };
    expect(areFiltersEqual(filters1, filters5)).toBe(false);
  });

  test('returns false when array lengths are different', () => {
    const filters1: Filters = {
      radius: [0.5],
      cuisines: [],
      dietary: [],
      priceLevel: 2,
      historyDays: 14,
      excludeChains: false,
      excludeCafe: false,
      departureTime: "12:00"
    };
    
    // Different radius array length
    const filters2: Filters = {
      ...filters1,
      radius: [0.5, 1.0]
    };
    expect(areFiltersEqual(filters1, filters2)).toBe(false);
    
    // Different cuisines array length
    const filters3: Filters = {
      ...filters1,
      cuisines: ['Italian']
    };
    expect(areFiltersEqual(filters1, filters3)).toBe(false);
    
    // Different dietary array length
    const filters4: Filters = {
      ...filters1,
      dietary: ['Vegetarian']
    };
    expect(areFiltersEqual(filters1, filters4)).toBe(false);
  });

  test('returns false when array values are different', () => {
    const filters1: Filters = {
      radius: [0.5],
      cuisines: ['Italian'],
      dietary: ['Vegetarian'],
      priceLevel: 2,
      historyDays: 14,
      excludeChains: false,
      excludeCafe: false,
      departureTime: "12:00"
    };
    
    // Different radius value
    const filters2: Filters = {
      ...filters1,
      radius: [1.0]
    };
    expect(areFiltersEqual(filters1, filters2)).toBe(false);
    
    // Different cuisines value
    const filters3: Filters = {
      ...filters1,
      cuisines: ['Chinese']
    };
    expect(areFiltersEqual(filters1, filters3)).toBe(false);
    
    // Different dietary value
    const filters4: Filters = {
      ...filters1,
      dietary: ['Vegan']
    };
    expect(areFiltersEqual(filters1, filters4)).toBe(false);
  });

  test('returns true when filters are identical', () => {
    const filters1: Filters = {
      radius: [0.5],
      cuisines: ['Italian', 'Chinese'],
      dietary: ['Vegetarian'],
      priceLevel: 2,
      historyDays: 14,
      excludeChains: true,
      excludeCafe: false,
      departureTime: "12:00"
    };
    
    const filters2: Filters = {
      radius: [0.5],
      cuisines: ['Italian', 'Chinese'],
      dietary: ['Vegetarian'],
      priceLevel: 2,
      historyDays: 14,
      excludeChains: true,
      excludeCafe: false,
      departureTime: "12:00"
    };
    
    expect(areFiltersEqual(filters1, filters2)).toBe(true);
  });
});

describe('areLocationsEqual', () => {
  test('returns true when both locations are undefined', () => {
    expect(areLocationsEqual(undefined, undefined)).toBe(true);
  });

  test('returns false when only one location is undefined', () => {
    const location: Location = {
      address: '123 Main St',
      lat: 51.5074,
      lng: -0.1278
    };
    expect(areLocationsEqual(location, undefined)).toBe(false);
    expect(areLocationsEqual(undefined, location)).toBe(false);
  });

  test('returns false when location properties are different', () => {
    const location1: Location = {
      address: '123 Main St',
      lat: 51.5074,
      lng: -0.1278
    };
    
    // Different address
    const location2: Location = {
      ...location1,
      address: '456 Oak St'
    };
    expect(areLocationsEqual(location1, location2)).toBe(false);
    
    // Different latitude
    const location3: Location = {
      ...location1,
      lat: 40.7128
    };
    expect(areLocationsEqual(location1, location3)).toBe(false);
    
    // Different longitude
    const location4: Location = {
      ...location1,
      lng: -74.0060
    };
    expect(areLocationsEqual(location1, location4)).toBe(false);
  });

  test('returns true when locations are identical', () => {
    const location1: Location = {
      address: '123 Main St',
      lat: 51.5074,
      lng: -0.1278
    };
    
    const location2: Location = {
      address: '123 Main St',
      lat: 51.5074,
      lng: -0.1278
    };
    
    expect(areLocationsEqual(location1, location2)).toBe(true);
  });
});