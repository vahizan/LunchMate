import { PlacesProvider, PlacesProviderType } from './types';
import { GooglePlacesProvider } from './google-places-provider';
import { FoursquareProvider } from './foursquare-places-provider';

/**
 * Factory class for creating places providers
 */
export class PlacesFactory {
  private static instance: PlacesFactory;
  private providers: Map<PlacesProviderType, PlacesProvider> = new Map();
  private activeProvider: PlacesProviderType = 'google'; // Default provider

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize providers
    this.providers.set('google', new GooglePlacesProvider());
    this.providers.set('foursquare', new FoursquareProvider());
    
    // Try to get the active provider from environment or config
    const configProvider = import.meta.env.VITE_PLACES_PROVIDER as PlacesProviderType;
    if (configProvider && (configProvider === 'google' || configProvider === 'foursquare')) {
      this.activeProvider = configProvider;
      console.log(`Using places provider from config: ${this.activeProvider}`);
    } else {
      console.log(`Using default places provider: ${this.activeProvider}`);
    }
  }

  /**
   * Get the singleton instance of the factory
   */
  public static getInstance(): PlacesFactory {
    if (!PlacesFactory.instance) {
      PlacesFactory.instance = new PlacesFactory();
    }
    return PlacesFactory.instance;
  }

  /**
   * Get the active places provider
   */
  public getProvider(): PlacesProvider {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Provider ${this.activeProvider} not found`);
    }
    return provider;
  }

  /**
   * Set the active provider
   * @param providerType The provider type to set as active
   */
  public setActiveProvider(providerType: PlacesProviderType): void {
    if (!this.providers.has(providerType)) {
      throw new Error(`Provider ${providerType} not found`);
    }
    this.activeProvider = providerType;
    console.log(`Active places provider set to: ${providerType}`);
  }

  /**
   * Get the current active provider type
   */
  public getActiveProviderType(): PlacesProviderType {
    return this.activeProvider;
  }
}