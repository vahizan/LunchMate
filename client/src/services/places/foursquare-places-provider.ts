import { PlacesProvider, PlaceResult } from './types';
import L from 'leaflet';

export class FoursquareProvider implements PlacesProvider {
  isLoaded: boolean = false;
  error: Error | null = null;
  private apiKey: string | undefined;
  private map: any = null;

  constructor() {
    this.apiKey = process.env.VITE_FOURSQUARE_PLACES_API_KEY;
    // Load Foursquare API
    this.loadApi();
    
  }

  private loadApi(): void {
    console.log('Loading Foursquare API...');
    
    if (!this.apiKey) {
      console.error('Foursquare API key is missing. Check your .env file.');
      this.error = new Error('Foursquare API key is missing');
      return;
    }
    
    // Foursquare doesn't require a script to be loaded like Google Maps
    // Just verify the API key is available and mark as loaded
    this.isLoaded = true;
    console.log('Foursquare API ready to use');
  }

  initAutocomplete(inputElement: HTMLInputElement, onPlaceSelected: (place: PlaceResult) => void): any {
    if (!this.isLoaded) {
      console.warn('Cannot initialize autocomplete: Foursquare API not loaded yet');
      return null;
    }

    if (!inputElement) {
      console.error('Cannot initialize autocomplete: Input element is null or undefined');
      return null;
    }

    console.log('Initializing Foursquare autocomplete');
    
    // Create a dropdown container for suggestions
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'foursquare-autocomplete-dropdown';
    dropdownContainer.style.position = 'absolute';
    dropdownContainer.style.width = `${inputElement.offsetWidth}px`;
    dropdownContainer.style.maxHeight = '200px';
    dropdownContainer.style.overflowY = 'auto';
    dropdownContainer.style.backgroundColor = 'white';
    dropdownContainer.style.border = '1px solid #ddd';
    dropdownContainer.style.borderTop = 'none';
    dropdownContainer.style.zIndex = '1000';
    dropdownContainer.style.display = 'none';
    
    // Insert the dropdown after the input element
    inputElement.parentNode?.insertBefore(dropdownContainer, inputElement.nextSibling);
    
    // Track current results
    let currentResults: any[] = [];
    
    // Add input event listener
    const inputHandler = async (e: Event) => {
      const query = (e.target as HTMLInputElement).value;
      
      // Hide dropdown if query is too short
      if (query.length < 3) {
        dropdownContainer.style.display = 'none';
        return;
      }
      
      try {
        // Use autocompleteLocations for regions/countries/cities
        const results = await this.autocompleteLocations(query);
        currentResults = results;
        
        // Display results
        if (results.length > 0) {
          dropdownContainer.innerHTML = '';
          
          results.forEach((result, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.style.padding = '8px 12px';
            item.style.cursor = 'pointer';
            item.style.borderBottom = index < results.length - 1 ? '1px solid #eee' : 'none';
            item.style.fontSize = '14px';
            
            // Highlight on hover
            item.addEventListener('mouseenter', () => {
              item.style.backgroundColor = '#f5f5f5';
            });
            
            item.addEventListener('mouseleave', () => {
              item.style.backgroundColor = 'white';
            });
            
            // Format the display text
            const name = result.name || 'Unknown Place';
            const address = result.location?.address || result.location?.formatted_address || '';
            item.textContent = `${name}${address ? ` - ${address}` : ''}`;
            
            // Handle click
            item.addEventListener('click', () => {
              // Set input value
              inputElement.value = name;
              
              // Hide dropdown
              dropdownContainer.style.display = 'none';
              
              // Convert to PlaceResult format and call the callback
              const placeResult: PlaceResult = {
                name: name,
                formatted_address: address,
                geometry: {
                  location: {
                    lat: () => result.geocodes?.main?.latitude || 0,
                    lng: () => result.geocodes?.main?.longitude || 0
                  }
                }
              };
              
              onPlaceSelected(placeResult);
            });
            
            dropdownContainer.appendChild(item);
          });
          
          dropdownContainer.style.display = 'block';
        } else {
          dropdownContainer.style.display = 'none';
        }
      } catch (error) {
        console.error('Error searching places:', error);
        dropdownContainer.style.display = 'none';
      }
    };
    
    // Debounce the input handler
    let debounceTimeout: number | null = null;
    inputElement.addEventListener('input', (e) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = window.setTimeout(() => {
        inputHandler(e);
      }, 300);
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!inputElement.contains(e.target as Node) && !dropdownContainer.contains(e.target as Node)) {
        dropdownContainer.style.display = 'none';
      }
    });
    
    // Return controller object
    return {
      clearResults: () => {
        dropdownContainer.innerHTML = '';
        dropdownContainer.style.display = 'none';
      },
      getResults: () => currentResults,
      destroy: () => {
        inputElement.removeEventListener('input', inputHandler);
        dropdownContainer.remove();
      }
    };
  }

  /**
   * Autocomplete locations (regions/countries/cities) using Foursquare's autocomplete API
   * This should be used for general location searches (not specific places like restaurants)
   */
  private async autocompleteLocations(query: string): Promise<any[]> {    
    try {
      // Build the URL with parameters
      const params = new URLSearchParams({
        query: query,
        limit: '5', // Limit results to 5 for better performance
        types: 'geo' // Focus on geographic entities (regions/countries/cities)
      });
      
      // Make the API call to the autocomplete endpoint
      const response = await fetch(
        `https://api.foursquare.com/v3/autocomplete?${params.toString()}`,
        {
          headers: {
            'Authorization': `${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Foursquare API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Foursquare autocomplete results:', data);
      
      // Process the results to ensure they have the required fields
      // The autocomplete API returns a different structure than the places search API
      const processedResults = (data.results || [])
        .filter((result: any) => result.type === 'geo') // Only include geographic results
        .map((result: any) => {
          const geoItem = result.geo || {};
          
          // Skip items without proper geocodes
          if (!geoItem.center || !geoItem.center.latitude || !geoItem.center.longitude) {
            console.warn('Foursquare autocomplete result missing geocodes:', result);
            return null;
          }
          
          // Format the result to match our expected structure
          return {
            name: result.text?.primary || geoItem.name || 'Unknown Location',
            location: {
              formatted_address: [
                geoItem.name,
                geoItem.locality,
                geoItem.region,
                geoItem.country
              ].filter(Boolean).join(', ')
            },
            geocodes: {
              main: {
                latitude: geoItem.center.latitude,
                longitude: geoItem.center.longitude
              }
            }
          };
        }).filter(Boolean); // Remove null results
      
      return processedResults;
    } catch (error) {
      console.error('Error fetching from Foursquare autocomplete:', error);
      return [];
    }
  }

  /**
   * Search for specific places (restaurants, hawker stalls, etc.) using Foursquare's places search API
   * This should be used for specific place searches, not general location autocomplete
   */
  private async searchPlaces(query: string): Promise<any[]> {
    console.log('Searching Foursquare places for:', query);
    
    try {
      // Build the URL with parameters
      const params = new URLSearchParams({
        query: query,
        limit: '5', // Limit results to 5 for better performance
        sort: 'RELEVANCE', // Sort by relevance
        fields: 'name,location,geocodes' // Only request the fields we need
      });
      
      // Make the API call
      const response = await fetch(
        `https://api.foursquare.com/v3/places/search?${params.toString()}`,
        {
          headers: {
            'Authorization': `${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Foursquare API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Foursquare search results:', data.results);
      
      // Process the results to ensure they have the required fields
      const processedResults = (data.results || []).map((result: any) => {
        // Ensure the result has geocodes
        if (!result.geocodes || !result.geocodes.main) {
          console.warn('Foursquare result missing geocodes:', result);
          return null;
        }
        
        return {
          ...result,
          // Ensure location has a formatted address
          location: {
            ...result.location,
            formatted_address: [
              result.location?.address,
              result.location?.locality,
              result.location?.region,
              result.location?.postcode,
              result.location?.country
            ].filter(Boolean).join(', ')
          }
        };
      }).filter(Boolean); // Remove null results
      
      return processedResults;
    } catch (error) {
      console.error('Error fetching from Foursquare:', error);
      return [];
    }
  }


  /**
   * Shows a map in the specified container with the given location
   * Uses OpenStreetMap via Leaflet
   */
  showMap(container: HTMLElement, location: { lat: number, lng: number }): any {
    console.log('FoursquareProvider.showMap called with location:', location);
    
    if (!container) {
      console.error('Cannot show map: Container element is null or undefined');
      return null;
    }
    if (!L) {
      console.error('Leaflet not available after loading');
      return null;
    }
    
    console.log('Creating map with Leaflet');
  
    
    // Remove existing map
    if(this.map) {
      this.map.remove();
    }

    this.map = L.map(container).setView([location.lat, location.lng], 15);
    
    // Add the OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
    
    // Add a marker at the specified location
    L.marker([location.lat, location.lng]).addTo(this.map);
    
    return this.map;
  }
  
  /**
   * Initializes a map in the specified container with the given options
   * This is a more general-purpose map initialization method
   */
  initMap(container: HTMLElement, options?: any): any {
    console.log('FoursquareProvider.initMap called');
    
    if (!container) {
      console.error('Cannot initialize map: Container element is null or undefined');
      return null;
    }
    
    const mapOptions = {
      center: options?.center || { lat: 40.7128, lng: -74.0060 }, // Default to New York
      zoom: options?.zoom || 12,
      ...options
    };
    
    if (!window.L) {
      console.error('Leaflet not available after loading');
      return null;
    }
    
    // Clear any existing map in the container
    container.innerHTML = '';
    
    // Create the map with options
    const map = window.L.map(container).setView(
      [mapOptions.center.lat, mapOptions.center.lng],
      mapOptions.zoom
    );
    
    // Add the OpenStreetMap tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add a marker at the center if requested
    if (mapOptions.marker !== false) {
      window.L.marker([mapOptions.center.lat, mapOptions.center.lng]).addTo(map);
    }
    
    return map;
  }

  async geocodeAddress(address: string): Promise<{ lat: number, lng: number } | null> {
    if (!this.isLoaded) return null;

    console.log('Foursquare geocodeAddress called with address:', address);
    
    if (!address || address.trim() === '') {
      console.warn('Empty address provided to geocodeAddress');
      return null;
    }
    
    try {
      // First try using the autocomplete API for regions/countries/cities
      console.log('Trying autocomplete API for geocoding');
      const autocompleteResults = await this.autocompleteLocations(address);
      
      if (autocompleteResults && autocompleteResults.length > 0) {
        const result = autocompleteResults[0];
        
        if (result.geocodes && result.geocodes.main) {
          console.log('Geocoded address using autocomplete API:', result.geocodes.main);
          return {
            lat: result.geocodes.main.latitude,
            lng: result.geocodes.main.longitude
          };
        } else {
          console.warn('Autocomplete geocoding result missing coordinates:', result);
        }
      }
      
      // Fall back to places search API if no results from autocomplete
      console.log('No results from autocomplete API, falling back to places search');
      
      // Use the Foursquare search API as fallback
      const params = new URLSearchParams({
        query: address,
        limit: '1', // Only need the top result
        fields: 'geocodes' // Only request the geocodes field
      });
      
      const response = await fetch(
        `https://api.foursquare.com/v3/places/search?${params.toString()}`,
        {
          headers: {
            'Authorization': `${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Parse the response
      if (data && data.results && data.results.length > 0) {
        const result = data.results[0];
        
        if (result.geocodes && result.geocodes.main) {
          console.log('Geocoded address using places search API:', result.geocodes.main);
          return {
            lat: result.geocodes.main.latitude,
            lng: result.geocodes.main.longitude
          };
        } else {
          console.warn('Places search geocoding result missing coordinates:', result);
        }
      } else {
        console.warn('No results found for address:', address);
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  getPhotoUrl(photoReference: string, maxWidth: number): string {
    // Foursquare has a different way of handling photos compared to Google
    console.log('Foursquare getPhotoUrl called with reference:', photoReference);
    
    if (!photoReference) {
      return `https://via.placeholder.com/${maxWidth}x${maxWidth}?text=No+Image+Available`;
    }
    
    // Foursquare photo references are direct URLs
    // We just need to add the size parameter
    // Format: https://fastly.4sqi.net/img/general/widthxheight/PHOTO_ID
    
    // Check if it's already a full URL
    if (photoReference.startsWith('http')) {
      // Try to modify the URL to include the requested size if it's a Foursquare URL
      if (photoReference.includes('fastly.4sqi.net/img/')) {
        // Replace the size in the URL
        return photoReference.replace(/\/\d+x\d+\//, `/${maxWidth}x${maxWidth}/`);
      }
      // If it's some other URL, just return it as is
      return photoReference;
    }
    
    // If it's just a photo ID, construct the full URL
    return `https://fastly.4sqi.net/img/general/${maxWidth}x${maxWidth}/${photoReference}`;
  }
}