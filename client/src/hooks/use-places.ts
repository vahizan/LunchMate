import { useEffect, useState, useCallback } from 'react';
import { PlacesFactory } from '@/services/places/places-factory';
import { PlacesProvider, PlacesProviderType, PlaceResult } from '@/services/places/types';
import { useAppContext } from '@/context/AppContext';

/**
 * Hook to access the places provider
 * This is the main entry point for components to use the places API
 */
export function usePlaces() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [providerType, setProviderType] = useState<PlacesProviderType>('foursquare');
  const {location} = useAppContext();
  
  // Get the provider instance
  const getProvider = useCallback((): PlacesProvider => {
    return PlacesFactory.getInstance().getProvider();
  }, []);
  
  // Initialize and track provider state
  useEffect(() => {
    const factory = PlacesFactory.getInstance();
    setProviderType(factory.getActiveProviderType());
    
    // Set up an interval to check the provider's loaded state
    const checkLoaded = () => {
      const provider = factory.getProvider();
      setIsLoaded(provider.isLoaded);
      setError(provider.error);
    };
    
    // Check immediately
    checkLoaded();
    
    // Then check periodically
    const interval = setInterval(checkLoaded, 500);
    
    // Clean up
    return () => clearInterval(interval);
  }, []);
  
  // Function to switch providers
  const switchProvider = useCallback((type: PlacesProviderType) => {
    try {
      const factory = PlacesFactory.getInstance();
      factory.setActiveProvider(type);
      setProviderType(type);
      
      // Update state based on new provider
      const provider = factory.getProvider();
      setIsLoaded(provider.isLoaded);
      setError(provider.error);
    } catch (error) {
      console.error('Error switching provider:', error);
      if (error instanceof Error) {
        setError(error);
      } else {
        setError(new Error('Failed to switch provider'));
      }
    }
  }, []);
  
  // Wrap provider methods to ensure they use the current provider
  const initAutocomplete = (
    inputElement: HTMLInputElement,
    onPlaceSelected: (place: PlaceResult) => void
  ) => {
    return getProvider().initAutocomplete(inputElement, onPlaceSelected);
  };
  
  const showMap = useCallback((
    container: HTMLElement,
    location: { lat: number, lng: number }
  ) => {
    return getProvider().showMap(container, location);
  }, [getProvider, location]);
  
  const geocodeAddress = useCallback(async (
    address: string
  ): Promise<{ lat: number, lng: number } | null> => {
    return getProvider().geocodeAddress(address);
  }, [getProvider]);
  
  const initMap = useCallback((
    container: HTMLElement,
    options?: any
  ) => {
    return getProvider().initMap(container, options);
  }, [getProvider]);
  
  const getPhotoUrl = useCallback((
    photoReference: string,
    maxWidth: number
  ): string => {
    return getProvider().getPhotoUrl(photoReference, maxWidth);
  }, [getProvider]);
  
  // Return the wrapped methods along with state
  return {
    isLoaded,
    error,
    providerType,
    switchProvider,
    initAutocomplete,
    showMap,
    geocodeAddress,
    initMap,
    getPhotoUrl,
  };
}