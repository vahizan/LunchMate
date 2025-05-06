import fetch from 'node-fetch';
import { FOOD_CATEGORIES, FOOD_CATEGORY_IDS } from '@shared/types';
import { config } from 'dotenv';
import { Location, Place, PlacePhoto, FilterOptions } from './foursquare.interfaces';
import {
  normalizeFieldsInput,
  mapToFoursquareFields,
  buildRequestParams,
  makeApiRequest,
  filterResults,
  processPlace,
  defaultFields,
  convertPriceLevel,
  calculateDistance
} from './foursquare.utils';

// Use any type for now to avoid TypeScript errors
const fetchAny: any = fetch;

// Get Foursquare API key from environment variables
const apiKey = config().parsed?.FOURSQUARE_API_KEY || '';

const categoryIds: string[] = [];
  
// Add base food category
categoryIds.push(FOOD_CATEGORY_IDS[FOOD_CATEGORIES.RESTAURANT]);
categoryIds.push(FOOD_CATEGORY_IDS[FOOD_CATEGORIES.FOOD_COURT]);
categoryIds.push(FOOD_CATEGORY_IDS[FOOD_CATEGORIES.FOOD_TRUCK]);
categoryIds.push(FOOD_CATEGORY_IDS[FOOD_CATEGORIES.FOOD]);
categoryIds.push(FOOD_CATEGORY_IDS[FOOD_CATEGORIES.HAWKER]);

// Build categories string from filters
function buildCategoriesString(filters: FilterOptions): string | undefined {
  // Foursquare category IDs for food establishments
  // Reference: https://developer.foursquare.com/docs/categories

  
  // Add cafe category only if not excluded
  console.log("exclude cage", filters.excludeCafe);
  if (!filters.excludeCafe) {
    console.log("filters backend", filters);
    categoryIds.push(FOOD_CATEGORY_IDS[FOOD_CATEGORIES.CAFE]);
  }
  
  // Add cuisine categories if available
  if (filters.cuisines && filters.cuisines.length > 0) {
    filters.cuisines.forEach(cuisine => {
      const lowerCuisine = cuisine.toLowerCase();
      if (FOOD_CATEGORY_IDS[lowerCuisine]) {
        categoryIds.push(FOOD_CATEGORY_IDS[lowerCuisine]);
      }
    });
  }
  
  // Add dietary categories if available
  if (filters.dietary && filters.dietary.length > 0) {
    filters.dietary.forEach(diet => {
      const lowerDiet = diet.toLowerCase();
      if (FOOD_CATEGORY_IDS[lowerDiet]) {
        categoryIds.push(FOOD_CATEGORY_IDS[lowerDiet]);
      }
    });
  }
  
  return categoryIds.length > 0 ? categoryIds.join(',') : undefined;
}


// Fetch restaurants from Foursquare Places API
/**
 * Fetches restaurants from Foursquare Places API
 */
export async function fetchRestaurants(
  location: Location,
  radius: number = 1000,
  filters: FilterOptions = {},
  fieldsToFetch: string | string[] = defaultFields,
  limit?: number,
): Promise<any[]> {
  try {
    console.log('Foursquare API key loaded:', apiKey ? 'API key is present' : 'API key is missing');
    if (!apiKey) {
      console.error('Foursquare API key is missing. Check your environment variables.');
      throw new Error('Foursquare API key is missing');
    }
    
    console.log('Fetching restaurants from Foursquare with filters:', filters);
    console.log('Input radius value:', radius, 'units');
    
    // Build the URL for places search
    const baseUrl = 'https://api.foursquare.com/v3/places/search';
    
    // Normalize fields input
    const fieldsArray = normalizeFieldsInput(fieldsToFetch);
    
    // Handle special case for 'fsq_id' only
    if (fieldsArray.length === 1 && fieldsArray[0] === 'fsq_id') {
      // If only fsq_id is requested, just fetch that field
      const params = buildRequestParams(location, radius, filters, 'fsq_id', buildCategoriesString, limit);
      console.log("params", params.toString());
      
      const data = await makeApiRequest(`${baseUrl}?${params.toString()}`, apiKey, fetchAny);
      
      // Filter and return just the IDs
      const results = filterResults(data.results || [], filters);
      return results.map(place => ({ place_id: place.fsq_id }));
    }
    
    // For normal case, map fields and build request
    const fsqFieldsString = mapToFoursquareFields(fieldsArray);
    const params = buildRequestParams(location, radius, filters, fsqFieldsString, buildCategoriesString, limit);
    
    console.log("params", params.toString());
    
    // Make the request
    const data = await makeApiRequest(`${baseUrl}?${params.toString()}`, apiKey, fetchAny);
    console.log(`Foursquare returned ${data.results?.length || 0} results`);
    
    // Filter results
    const filteredResults = filterResults(data.results || [], filters);
    
    // Process each place and return
    return filteredResults.map((place: Place) => processPlace(place, fieldsArray, location));
    
  } catch (error) {
    console.error('Error fetching restaurants from Foursquare:', error);
    throw error;
  }
}

// Fetch details for a specific restaurant
export async function fetchRestaurantDetails(placeId: string): Promise<any> {
  try {
    if (!apiKey) {
      console.error('Foursquare API key is missing. Check your environment variables.');
      throw new Error('Foursquare API key is missing');
    }
    
    const fsqFieldsString = mapToFoursquareFields(defaultFields);

    const url = `https://api.foursquare.com/v3/places/${placeId}?fields=${fsqFieldsString}`;
    
    const response = await fetchAny(url, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`);
    }
    
    const place = await response.json();
    
    // Extract the photos if available
    const photos = place.photos?.map((photo: any) => ({
      photo_reference: photo.id,
      height: photo.height,
      width: photo.width
    }));
    
    // Extract place types from categories
    const types = place.categories?.map((cat: any) => cat.name.toLowerCase()) || [];
    
    // Convert to our Restaurant format
    return {
      place_id: place.fsq_id,
      name: place.name,
      formatted_address: [
        place.location?.address,
        place.location?.locality,
        place.location?.region,
        place.location?.postcode,
        place.location?.country
      ].filter(Boolean).join(', '),
      vicinity: place.location?.address,
      rating: place.rating ? place.rating / 2 : undefined, // Convert from 10 to 5 scale
      user_ratings_total: place.stats?.total_ratings || 0,
      price_level: place.price ? convertPriceLevel(place.price) : undefined,
      types,
      photos,
      opening_hours: place.hours ? {
        open_now: place.hours?.is_open_now || false,
        weekday_text: place.hours?.display || []
      } : undefined,
      geometry: {
        location: {
          lat: place.geocodes?.main?.latitude || 0,
          lng: place.geocodes?.main?.longitude || 0
        }
      },
      formatted_phone_number: place.tel,
      website: place.website,
      menu: place.menu,
      description: place.description,
      open_now: place.hours?.is_open_now || false
    };
  } catch (error) {
    console.error('Error fetching restaurant details from Foursquare:', error);
    throw error;
  }
}

// Fetch images for a specific place
export async function fetchPlaceImages(placeId: string): Promise<any[]> {
  try {
    if (!apiKey) {
      console.error('Foursquare API key is missing. Check your environment variables.');
      throw new Error('Foursquare API key is missing');
    }
    
    // First, we need to get the place details which include the photos
    const url = `https://api.foursquare.com/v3/places/${placeId}/photos`;
    
    const response = await fetchAny(url, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process and return the photos in a standardized format
    return data.map((photo: any) => ({
      photo_reference: photo.id,
      height: photo.height,
      width: photo.width,
      prefix: photo.prefix,
      suffix: photo.suffix,
      created_at: photo.created_at,
      url: `${photo.prefix}original${photo.suffix}` // Construct the full URL for the original size image
    }));
  } catch (error) {
    console.error('Error fetching place images from Foursquare:', error);
    throw error;
  }
}