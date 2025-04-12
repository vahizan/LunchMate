import { useState, useEffect, useCallback } from 'react';

// Maps API Loader
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsApi(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    window.initGoogleMapsCallback = () => {
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function useGooglePlaces() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load Google Maps API
  useEffect(() => {
    loadGoogleMapsApi()
      .then(() => setIsLoaded(true))
      .catch((err) => setError(err));
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize Places Autocomplete on an input element
  const initAutocomplete = useCallback((inputElement: HTMLInputElement, onPlaceSelected: (place: google.maps.places.PlaceResult) => void) => {
    if (!isLoaded || !window.google) return;

    const autocomplete = new google.maps.places.Autocomplete(inputElement, {
      types: ['geocode', 'establishment'],
      fields: ['formatted_address', 'geometry', 'name'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        onPlaceSelected(place);
      }
    });

    return autocomplete;
  }, [isLoaded]);

  // Show a map in a container
  const showMap = useCallback((container: HTMLElement, location: { lat: number, lng: number }) => {
    if (!isLoaded || !window.google) return;

    const map = new google.maps.Map(container, {
      center: location,
      zoom: 15,
    });

    new google.maps.Marker({
      position: location,
      map,
    });

    return map;
  }, [isLoaded]);

  // Get geocode from address
  const geocodeAddress = useCallback(async (address: string): Promise<{ lat: number, lng: number } | null> => {
    if (!isLoaded || !window.google) return null;

    const geocoder = new google.maps.Geocoder();
    
    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
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

  return {
    isLoaded,
    error,
    initAutocomplete,
    showMap,
    geocodeAddress
  };
}
