import { Location } from "@/types";

// Common interface for all place providers
export interface PlacesProvider {
  // Status
  isLoaded: boolean;
  error: Error | null;
  
  // Autocomplete functionality
  initAutocomplete: (
    inputElement: HTMLInputElement, 
    onPlaceSelected: (place: PlaceResult) => void
  ) => any;
  
  // Map functionality
  showMap: (
    container: HTMLElement, 
    location: { lat: number, lng: number }
  ) => any;
  
  // Geocoding functionality
  geocodeAddress: (
    address: string
  ) => Promise<{ lat: number, lng: number } | null>;
  
  // Map initialization
  initMap: (
    container: HTMLElement, 
    options?: any
  ) => any;
  
  // Get photo URL
  getPhotoUrl: (
    photoReference: string, 
    maxWidth: number
  ) => string;
}

// Common place result interface
export interface PlaceResult {
  formatted_address?: string;
  name?: string;
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    }
  };
}

// Provider type
export type PlacesProviderType = 'google' | 'foursquare' | 'hybrid';