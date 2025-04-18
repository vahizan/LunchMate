import { useState, useEffect, useCallback } from 'react';

// Maps API Loader
let googleMapsPromise: Promise<void> | null = null;


function loadGoogleMapsApi(): Promise<void> {
  if (googleMapsPromise) {
    console.log('Using existing Google Maps API promise');
    return googleMapsPromise;
  }

  console.log('Creating new Google Maps API loading promise');
  googleMapsPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      const error = new Error('Google Maps API key is missing');
      console.error(error);
      reject(error);
      return;
    }
    
    // Define the callback function
    window.initGoogleMapsCallback = function() {
      console.log('Google Maps API loaded callback triggered');
      if (window.google && window.google.maps) {
        console.log('Google Maps API loaded successfully');
        resolve();
      } else {
        const error = new Error('Google Maps API failed to initialize properly');
        console.error(error);
        reject(error);
      }
    };
  
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places&callback=initGoogleMapsCallback`;

    script.async = true;
    script.defer = true;
    
    // Add error handler
    script.onerror = (event) => {
      const error = new Error('Failed to load Google Maps API script');
      console.error(error, event);
      reject(error);
    };
    
    console.log('Appending Google Maps script to document head');
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function useGooglePlaces() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load Google Maps API
  useEffect(() => {
    console.log('Loading Google Maps API...');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key is missing. Check your .env file.');
      setError(new Error('Google Maps API key is missing'));
      return;
    }
    
    console.log('API Key available:', apiKey ? 'Yes' : 'No');
    
    loadGoogleMapsApi()
      .then(() => {
        console.log('Google Maps API loaded successfully');
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error('Error loading Google Maps API:', err);
        setError(err);
      });
  }, []);

  // Initialize Places Autocomplete on an input element
  const initAutocomplete = useCallback((inputElement: HTMLInputElement, onPlaceSelected: (place: any) => void) => {
    console.log('initAutocomplete called, isLoaded:', isLoaded, 'window.google available:', !!window.google);
    
    if (!inputElement) {
      console.error('Cannot initialize autocomplete: Input element is null or undefined');
      return null;
    }
    
    if (!isLoaded) {
      console.warn('Cannot initialize autocomplete: Google Maps not loaded yet');
      return null;
    }
    
    if (!window.google) {
      console.error('Cannot initialize autocomplete: window.google is not available');
      return null;
    }
    
    if (!window.google.maps || !window.google.maps.places) {
      console.error('Cannot initialize autocomplete: Google Maps Places library not loaded');
      return null;
    }

    try {
      // Using the correct Google Maps Places Autocomplete class
      console.log('Creating Autocomplete instance...');
      const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
        types: ['geocode', 'establishment'],
        fields: ['formatted_address', 'geometry', 'name'],
      });

      console.log('Autocomplete instance created successfully');
      
      autocomplete.addListener('place_changed', () => {
        console.log('Place changed event triggered');
        const place = autocomplete.getPlace();
        console.log('Selected place:', place);
        if (place && place.geometry) {
          onPlaceSelected(place);
        } else {
          console.warn('Selected place has no geometry data');
        }
      });

      return autocomplete;
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      setError(error instanceof Error ? error : new Error('Failed to initialize autocomplete'));
      return null;
    }
  }, [isLoaded]);

  // Show a map in a container
  const showMap = useCallback((container: HTMLElement, location: { lat: number, lng: number }) => {
    if (!isLoaded || !window.google) return;

    const map = new window.google.maps.Map(container, {
      center: location,
      zoom: 15,
    });

    new window.google.maps.Marker({
      position: location,
      map,
    });

    return map;
  }, [isLoaded]);

  // Get geocode from address
  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number, lng: number } | null> => {
    if (!isLoaded || !window.google) return null;

    const geocoder = new window.google.maps.Geocoder();
    
    try {
      const result = await new Promise<any[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results: any[], status: any) => {
          if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      if (result && result[0] && result[0].geometry) {
        return {
          lat: result[0].geometry.location.lat(),
          lng: result[0].geometry.location.lng()
        };
      }
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  }, [isLoaded]);

  // Initialize a map in a container element
  const initMap = useCallback((container: HTMLElement, options?: any) => {
    if (!isLoaded || !window.google) return null;
    
    const mapOptions = {
      center: { lat: 40.7128, lng: -74.0060 }, // Default to New York
      zoom: 12,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      ...options
    };
    
    return new window.google.maps.Map(container, mapOptions);
  }, [isLoaded]);

  return {
    isLoaded,
    error,
    initAutocomplete,
    showMap,
    geocodeAddress,
    initMap
  };
}
