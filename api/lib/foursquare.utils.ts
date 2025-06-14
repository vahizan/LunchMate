import { Headers } from 'node-fetch';
import { Location, Place, PlacePhoto, FilterOptions } from './foursquare.interfaces';

// Map of our standardized field names to Foursquare API field names
export const fieldMappings: Record<string, string> = {
  fsq_id: 'fsq_id',
  name: 'name',
  location: 'location',
  rating: 'rating',
  price: 'price',
  categories: 'categories',
  photos: 'photos',
  hours: 'hours',
  geometry: 'geocodes',
  popularity: 'popularity',
  stats: 'stats',
  description: 'description',
  distance: 'distance',
  tel: 'tel',
  website: 'website',
  menu: 'menu'
};

// Default fields to fetch if none specified
export const defaultFields = Object.keys(fieldMappings);

/**
 * Converts input fields to an array of field names
 */
export function normalizeFieldsInput(fieldsToFetch: string | string[]): string[] {
  return typeof fieldsToFetch === 'string' 
    ? fieldsToFetch.split(',') 
    : fieldsToFetch;
}

/**
 * Maps our field names to Foursquare API field names
 */
export function mapToFoursquareFields(fieldsArray: string[]): string {
  const fsqFields = new Set<string>();
  
  // Always include fsq_id as it's required for identification
  fsqFields.add('fsq_id');
  
  // Add Foursquare fields based on requested fields
  fieldsArray.forEach(field => {
    if (fieldMappings[field]) {
      fsqFields.add(fieldMappings[field]);
    } else if (field.includes('_')) {
      // Handle case where the field might be a direct Foursquare field
      fsqFields.add(field);
    }
  });
  
  return Array.from(fsqFields).join(',');
}

/**
 * Builds URL parameters for the Foursquare API request
 */
export function buildRequestParams(
  location: Location, 
  radius: number, 
  filters: FilterOptions, 
  fields: string,
  buildCategoriesString: (filters: FilterOptions) => string | undefined,
  limit?: string,
  cursor?: string,
): URLSearchParams {
  const params = new URLSearchParams({
    ll: `${location.lat},${location.lng}`,
    radius: radius.toString(),
    sort: 'distance', // Sort by distance
    fields: fields,
  });
  
  // Only add limit if provided
  if (limit) {
    params.append('limit', limit);
  }

  if (cursor) {
    params.append('cursor', cursor);
  }
  
  // Add categories if available
  const categories = buildCategoriesString(filters);
  if (categories) {
    params.append('categories', categories);
  }
  
  // Add price level filter if specified
  if (filters.priceLevel !== undefined) {
    // Foursquare uses 1-4 scale, where 1 is least expensive
    const minPrice = Math.max(filters.priceLevel - 1, 1);
    const maxPrice = filters.priceLevel;
    params.append('min_price', minPrice.toString());
    params.append('max_price', maxPrice.toString());
  }
  
  console.log("PARAMS IN BUILD PARAMS", params);
  return params;
}

/**
 * Makes a request to the Foursquare API
 */
export async function makeApiRequest(url: string, apiKey: string, fetchFn: any): Promise<{response: any, headers: Headers}> {
  if (!apiKey) {
    throw new Error('Foursquare API key is missing');
  }
  
  const response = await fetchFn(url, {
    headers: {
      'Authorization': apiKey,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Foursquare API error: ${response.status}`);
  }
  
  return { response: response.json(), headers: response.headers };
}

/**
 * Filters results based on filters
 */
export const filterResults = (results: Place[], filters: FilterOptions): Place[] =>  filters?.excludeChains ? results.filter(place => !place.chains || place.chains.length === 0) : results;


/**
 * Helper function to calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(location1: Location, location2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(location2.lat - location1.lat);
  const dLng = toRad(location2.lng - location1.lng);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(location1.lat)) * Math.cos(toRad(location2.lat)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
export function toRad(degrees: number): number {
  return degrees * (Math.PI/180);
}

/**
 * Convert Foursquare price level to Google price level equivalent
 */
export function convertPriceLevel(fsqPriceLevel: number): number {
  // Foursquare uses 1-4 scale, Google uses 0-4 scale
  // Adjust accordingly
  return Math.min(fsqPriceLevel, 4);
}

export const processPlaces = (places: Place[],  fieldsArray: string[], userLocation: Location) => {
  return places.map(place => processPlace(place,fieldsArray, userLocation ))
}
/**
 * Processes a place object and extracts the requested fields
 */
export function processPlace(place: Place, fieldsArray: string[], userLocation?: Location): any {
  // Create the result object with only the requested fields
  const result: any = {
    // Always include place_id as it's required for identification
    place_id: place.fsq_id
  };
  
  // Process each requested field
  for (const field of fieldsArray) {
    switch (field) {
      case 'name':
        if (place.name) result.name = place.name;
        break;
        
      case 'formatted_address':
        if (place.location) {
          result.formatted_address = [
            place.location?.address,
            place.location?.locality,
            place.location?.region,
            place.location?.postcode,
            place.location?.country
          ].filter(Boolean).join(', ');
        }
        break;
        
      case 'menu':
        if (place.menu) result.menu = place.menu;
        break;
        
      case 'vicinity':
        if (place.location?.address) result.vicinity = place.location.address;
        break;
        
      case 'rating':
        if (place.rating) result.rating = place.rating / 2; // Convert from 10 to 5 scale
        break;
        
      case 'user_ratings_total':
        if (place.stats?.total_ratings) result.user_ratings_total = place.stats.total_ratings;
        break;
        
      case 'price_level':
        if (place.price) result.price_level = convertPriceLevel(place.price);
        break;
        
      case 'types':
        if (place.categories) {
          result.types = place.categories.map((cat: any) => cat.name.toLowerCase());
        }
        break;
        
      case 'photos':
        if (place.photos) {
          result.photos = place.photos.map((photoDetails: PlacePhoto) => {
            return {
              id: photoDetails?.id,
              created_at: photoDetails?.created_at,
              small: `${photoDetails?.prefix}${(200/photoDetails.height)*photoDetails.width}x${200}${photoDetails?.suffix}`,
              large: `${photoDetails?.prefix}${(600/photoDetails.height)*photoDetails.width}x${600}${photoDetails?.suffix}`,
              xlarge: `${photoDetails?.prefix}${photoDetails.height}x${photoDetails.width}${photoDetails?.suffix}`,
            };
          });
        }
        break;
        
      case 'hours':
        if (place.hours) {
          result.opening_hours = {
            hours: place.hours,
            open_now: place.hours?.open_now || false,
            weekday_text: place.hours?.display || []
          };
        }
        break;
        
      case 'geometry':
        if (place.geocodes?.main) {
          const placeLocation = {
            lat: place.geocodes.main.latitude || 0,
            lng: place.geocodes.main.longitude || 0
          };
          result.geometry = { location: placeLocation };
        }
        break;
        
      case 'popularity':
        if (place.popularity) result.popularity = place.popularity;
        break;
        
      case 'metadata':
        if (place.stats) result.metadata = place.stats;
        break;
        
      case 'description':
        if (place.description) result.description = place.description;
        break;
        
      case 'distance':
        // Calculate distance if not provided by Foursquare
        if(!userLocation) {
          result.distance = 'N/A';
          break;
        }
        const placeLocation = {
          lat: place.geocodes?.main?.latitude || 0,
          lng: place.geocodes?.main?.longitude || 0
        };
        result.distance = place.distance ? place.distance / 1000 : calculateDistance(userLocation, placeLocation);
        break;
        
      case 'formatted_phone_number':
        if (place.tel) result.formatted_phone_number = place.tel;
        break;
        
      case 'website':
        if (place.website) result.website = place.website;
        break;
        
      case 'open_now':
        if (place.hours) result.open_now = place.hours?.open_now || false;
        break; 
    }
  }
  
  return result;
}