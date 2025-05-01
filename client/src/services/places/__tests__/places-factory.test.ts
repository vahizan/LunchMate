import { PlacesFactory } from '../places-factory';
import { GooglePlacesProvider } from '../google-places-provider';
import { FoursquareProvider } from '../foursquare-places-provider';
import { HybridPlacesProvider } from '../hybrid-places-provider';

// Mock the providers
jest.mock('../google-places-provider');
jest.mock('../foursquare-places-provider');
jest.mock('../hybrid-places-provider');

// Mock environment variables
const originalEnv = process.env;

describe('PlacesFactory', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset singleton instance
    // @ts-ignore - accessing private property for testing
    PlacesFactory.instance = undefined;
    
   

  });

  afterAll(() => {
    process.env = originalEnv;
    process.env.VITE_PLACES_PROVIDER = undefined;
  });

  test('should create singleton instance', () => {
    const factory1 = PlacesFactory.getInstance();
    const factory2 = PlacesFactory.getInstance();
    
    expect(factory1).toBe(factory2);
  });

  test('should initialize with default hybrid provider', () => {
    const factory = PlacesFactory.getInstance();
    
    expect(factory.getActiveProviderType()).toBe('hybrid');
    expect(HybridPlacesProvider).toHaveBeenCalledTimes(1);
  });

  test('should use provider from environment variable', () => {
    process.env.VITE_PLACES_PROVIDER = 'google';
    
    const factory = PlacesFactory.getInstance();
    
    expect(factory.getActiveProviderType()).toBe('google');
  });

  test('should set active provider', () => {
    const factory = PlacesFactory.getInstance();
    
    factory.setActiveProvider('foursquare');
    
    expect(factory.getActiveProviderType()).toBe('foursquare');
  });

  test('should throw error when setting invalid provider', () => {
    const factory = PlacesFactory.getInstance();
    
    // @ts-ignore - testing invalid provider
    expect(() => factory.setActiveProvider('invalid')).toThrow();
  });

  test('should return the correct provider instance', () => {
    const factory = PlacesFactory.getInstance();
    
    factory.setActiveProvider('google');
    expect(factory.getProvider()).toBeInstanceOf(GooglePlacesProvider);
    
    factory.setActiveProvider('foursquare');
    expect(factory.getProvider()).toBeInstanceOf(FoursquareProvider);
    
    factory.setActiveProvider('hybrid');
    expect(factory.getProvider()).toBeInstanceOf(HybridPlacesProvider);
  });
});