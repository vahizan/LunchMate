import { PlacesProvider, PlacesProviderType } from '../types';

// Mock implementation of the PlacesFactory
export class PlacesFactory {
  private static instance: PlacesFactory;
  private providers: Map<PlacesProviderType, PlacesProvider> = new Map();
  private activeProvider: PlacesProviderType = 'hybrid'; // Default provider

  private constructor() {
    // Initialize mock providers
    this.providers.set('google', {
      isLoaded: true,
      error: null,
      initAutocomplete: jest.fn(),
      showMap: jest.fn(),
      geocodeAddress: jest.fn(),
      initMap: jest.fn(),
      getPhotoUrl: jest.fn()
    } as unknown as PlacesProvider);
    
    this.providers.set('foursquare', {
      isLoaded: true,
      error: null,
      initAutocomplete: jest.fn(),
      showMap: jest.fn(),
      geocodeAddress: jest.fn(),
      initMap: jest.fn(),
      getPhotoUrl: jest.fn()
    } as unknown as PlacesProvider);
    
    this.providers.set('hybrid', {
      isLoaded: true,
      error: null,
      initAutocomplete: jest.fn(),
      showMap: jest.fn(),
      geocodeAddress: jest.fn(),
      initMap: jest.fn(),
      getPhotoUrl: jest.fn()
    } as unknown as PlacesProvider);
    
    // Use the default provider
    this.activeProvider = 'hybrid';
  }

  public static getInstance(): PlacesFactory {
    if (!PlacesFactory.instance) {
      PlacesFactory.instance = new PlacesFactory();
    }
    return PlacesFactory.instance;
  }

  public getProvider(): PlacesProvider {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Provider ${this.activeProvider} not found`);
    }
    return provider;
  }

  public setActiveProvider(providerType: PlacesProviderType): void {
    if (!this.providers.has(providerType)) {
      throw new Error(`Provider ${providerType} not found`);
    }
    this.activeProvider = providerType;
  }

  public getActiveProviderType(): PlacesProviderType {
    return this.activeProvider;
  }
  
  // For testing purposes
  public static resetInstance(): void {
    PlacesFactory.instance = undefined as any;
  }
}