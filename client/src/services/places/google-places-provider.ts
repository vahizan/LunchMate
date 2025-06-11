import { PlacesProvider, PlaceResult } from './types';

// Maps API Loader
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsApi(): Promise<void> {
  if (googleMapsPromise) {
    console.log('Using existing Google Maps API promise');
    return googleMapsPromise;
  }

  console.log('Creating new Google Maps API loading promise');
  googleMapsPromise = new Promise((resolve, reject) => {
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
    // Use the backend proxy to load the Google Maps script
    script.src = `/api/proxy/google/maps-script?libraries=places&callback=initGoogleMapsCallback`;

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

export class GooglePlacesProvider implements PlacesProvider {
  isLoaded: boolean = false;
  error: Error | null = null;

  constructor() {
    // Load Google Maps API
    this.loadApi();
  }

  private loadApi(): void {
    console.log('Loading Google Maps API...');
    
    loadGoogleMapsApi()
      .then(() => {
        console.log('Google Maps API loaded successfully');
        this.isLoaded = true;
      })
      .catch((err) => {
        console.error('Error loading Google Maps API:', err);
        this.error = err;
      });
  }

  initAutocomplete(inputElement: HTMLInputElement, onPlaceSelected: (place: PlaceResult) => void): any {
    console.log('initAutocomplete called, isLoaded:', this.isLoaded, 'window.google available:', !!window.google);
    
    if (!inputElement) {
      console.error('Cannot initialize autocomplete: Input element is null or undefined');
      return null;
    }
    
    if (!this.isLoaded) {
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
      this.error = error instanceof Error ? error : new Error('Failed to initialize autocomplete');
      return null;
    }
  }

  showMap(container: HTMLElement, location: { lat: number, lng: number }): any {
    if (!this.isLoaded || !window.google) return null;

    const map = new window.google.maps.Map(container, {
      center: location,
      zoom: 15,
    });

    new window.google.maps.Marker({
      position: location,
      map,
    });

    return map;
  }

  async geocodeAddress(address: string): Promise<{ lat: number, lng: number } | null> {
    try {
      // Use the backend proxy for geocoding
      const response = await fetch(`/api/proxy/google/geocode?address=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng
        };
      }
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  }

  initMap(container: HTMLElement, options?: any): any {
    if (!this.isLoaded || !window.google) return null;
    
    const mapOptions = {
      center: { lat: 40.7128, lng: -74.0060 }, // Default to New York
      zoom: 12,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      ...options
    };
    
    return new window.google.maps.Map(container, mapOptions);
  }

  getPhotoUrl(photoReference: string, maxWidth: number): string {
    return `/api/proxy/google/place-photo?maxwidth=${maxWidth}&photoreference=${photoReference}`;
  }
}