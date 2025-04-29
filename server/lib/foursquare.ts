import fetch from 'node-fetch';
import { FOOD_CATEGORIES, FOOD_CATEGORY_IDS } from '@shared/types';
import { config } from 'dotenv';
import { Location, Place, PlacePhoto, FilterOptions } from './foursquare.interfaces';

// Use any type for now to avoid TypeScript errors
const fetchAny: any = fetch;

// Get Foursquare API key from environment variabless
const apiKey = config().parsed?.FOURSQUARE_API_KEY || '';

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(location1: Location, location2: Location): number {
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

function toRad(degrees: number): number {
  return degrees * (Math.PI/180);
}

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
    categoryIds.push(FOOD_CATEGORIES.CAFE);
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

// Convert Foursquare price level to Google price level equivalent
function convertPriceLevel(fsqPriceLevel: number): number {
  // Foursquare uses 1-4 scale, Google uses 0-4 scale
  // Adjust accordingly
  return Math.min(fsqPriceLevel, 4);
}

// Fetch restaurants from Foursquare Places API
export async function fetchRestaurants(
  location: Location,
  radius: number = 1000,
  filters: FilterOptions = {},
  limit: number = 50,
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
    
    
    // Build query parameters
    const params = new URLSearchParams({
      ll: `${location.lat},${location.lng}`,
      radius: radius.toString(),
      limit: limit.toString(), 
      sort: 'distance', // Sort by distance
      fields: 'fsq_id,name,location,geocodes,categories,distance,rating,price,photos,hours,website,tel,stats',
    });
    
    // Add categories if available
    const categories = buildCategoriesString(filters);
    if (categories) {
      params.append('categories', categories);
    }
    
    // Add price level filter if specified
    if (filters.priceLevel !== undefined) {
      // Foursquare uses 1-4 scale, where 1 is least expensive
      // Convert our price level to Foursquare's scale
      const minPrice = Math.max(filters.priceLevel - 1, 1);
      const maxPrice = filters.priceLevel;
      params.append('min_price', minPrice.toString());
      params.append('max_price', maxPrice.toString());
    }
    
    // Make the request
    const response = await fetchAny(`${baseUrl}?${params.toString()}`, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Foursquare returned ${data.results?.length || 0} results`);
    
    // Process results and convert to our Restaurant format
    let results: Place[] = data.results || [];
    
    // Filter out chain restaurants if requested
    if (filters.excludeChains) {
      console.log('Filtering out chain restaurants');
      results = results.filter(place => !place.chains || place.chains.length === 0);
    }
    
    return results.map((place: Place) => {
      // Extract the first photo if available
      const photos = place.photos?.map((photoDetails :PlacePhoto) => {
        return {
          id: photoDetails?.id,
          created_at: photoDetails?.created_at,
          small: `${photoDetails?.prefix}${(200/photoDetails.height)*photoDetails.width}x${200}${photoDetails?.suffix}`,
          large: `${photoDetails?.prefix}${(600/photoDetails.height)*photoDetails.width}x${600}${photoDetails?.suffix}`,
          xlarge: `${photoDetails?.prefix}${photoDetails.height}x${photoDetails.width}${photoDetails?.suffix}`,
        }
      });
      
      // Extract place types from categories
      const types = place.categories?.map((cat: any) => cat.name.toLowerCase()) || [];
      
      // Convert Foursquare location to our format
      const placeLocation = {
        lat: place.geocodes?.main?.latitude || 0,
        lng: place.geocodes?.main?.longitude || 0
      };
      
      // Calculate distance if not provided by Foursquare
      const distance = place.distance ? place.distance / 1000 : calculateDistance(location, placeLocation);
      
      // Convert to our Restaurant format
      console.log("types", types);
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
        menu: place?.menu,
        vicinity: place.location?.address,
        rating: place.rating ? place.rating / 2 : undefined, // Convert from 10 to 5 scale
        user_ratings_total: place.stats?.total_ratings || 0,
        price_level: place.price ? convertPriceLevel(place.price) : undefined,
        types,
        photos,
        opening_hours: place.hours ? {
          hours: place?.hours,
          open_now: place.hours?.is_open_now || false,
          weekday_text: place.hours?.display || []
        } : undefined,
        geometry: {
          location: placeLocation
        },
        popularity: place?.popularity,
        metadata: place?.stats,
        description: place?.description,
        distance,
        formatted_phone_number: place.tel,
        website: place.website,
        open_now: place.hours?.is_open_now || false
      };
    });
    
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
    
    const url = `https://api.foursquare.com/v3/places/${placeId}`;
    
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