import { PlacesProvider, PlaceResult } from './types';
import { FoursquareProvider } from './foursquare-places-provider';
import { GooglePlacesProvider } from './google-places-provider';

/**
 * Hybrid provider that uses Foursquare for autocomplete and data,
 * but Google Maps for map display
 */
export class HybridPlacesProvider implements PlacesProvider {
  isLoaded: boolean = false;
  error: Error | null = null;
  
  private foursquareProvider: FoursquareProvider;
  private googleProvider: GooglePlacesProvider;
  private googleApiKey: string | undefined;
  
  constructor() {
    // Initialize both providers
    this.foursquareProvider = new FoursquareProvider();
    this.googleProvider = new GooglePlacesProvider();
    this.googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // Track loading state
    this.checkLoadingState();
  }
  
  private checkLoadingState() {
    // Set up an interval to check both providers' loaded state
    const checkLoaded = () => {
      // We need both providers to be loaded
      const googleLoaded = this.googleProvider.isLoaded;
      const foursquareLoaded = this.foursquareProvider.isLoaded;
      
      console.log(`HybridProvider: Checking loading state - Google: ${googleLoaded}, Foursquare: ${foursquareLoaded}`);
      
      if (googleLoaded && foursquareLoaded) {
        this.isLoaded = true;
        clearInterval(interval);
        console.log('HybridProvider: Both providers loaded successfully');
      }
      
      // If either provider has an error, propagate it
      if (this.googleProvider.error) {
        this.error = this.googleProvider.error;
        console.error('HybridProvider: Google provider error:', this.error);
      } else if (this.foursquareProvider.error) {
        this.error = this.foursquareProvider.error;
        console.error('HybridProvider: Foursquare provider error:', this.error);
      }
    };
    
    // Check immediately
    checkLoaded();
    
    // Then check periodically
    const interval = setInterval(checkLoaded, 500);
    
    // Clean up after 30 seconds to avoid memory leaks
    setTimeout(() => clearInterval(interval), 30000);
  }
  
  /**
   * Initialize autocomplete using Foursquare
   */
  initAutocomplete(
    inputElement: HTMLInputElement,
    onPlaceSelected: (place: PlaceResult) => void
  ): any {
    console.log('HybridProvider: Initializing autocomplete with Foursquare');
    return this.foursquareProvider.initAutocomplete(inputElement, onPlaceSelected);
  }
  
  /**
   * Show map using Google Maps
   */
  showMap(
    container: HTMLElement,
    location: { lat: number, lng: number }
  ): any {
    console.log('HybridProvider: Showing map with Google Maps', location);
    return this.googleProvider.showMap(container, location);
  }
  
  /**
   * Geocode address using Foursquare
   */
  async geocodeAddress(
    address: string
  ): Promise<{ lat: number, lng: number } | null> {
    console.log('HybridProvider: Geocoding address with Foursquare');
    return this.foursquareProvider.geocodeAddress(address);
  }
  
  /**
   * Initialize map using Google Maps
   */
  initMap(
    container: HTMLElement,
    options?: any
  ): any {
    console.log('HybridProvider: Initializing map with Google Maps');
    return this.googleProvider.initMap(container, options);
  }
  
  /**
   * Get photo URL using Foursquare
   */
  getPhotoUrl(
    photoReference: string,
    maxWidth: number
  ): string {
    console.log('HybridProvider: Getting photo URL with Foursquare');
    return this.foursquareProvider.getPhotoUrl(photoReference, maxWidth);
  }
}