import fetch from 'node-fetch';

// Get Google Maps API key from environment variables
const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

// Type for location
interface Location {
  lat: number;
  lng: number;
}

// Type for filter options
interface FilterOptions {
  cuisines?: string[];
  dietary?: string[];
  priceLevel?: number;
}

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

// Build type/cuisine keyword string from filters
function buildKeywordString(filters: FilterOptions): string | undefined {
  const keywords: string[] = [];
  
  // Add cuisines to keywords
  if (filters.cuisines && filters.cuisines.length > 0) {
    keywords.push(...filters.cuisines);
  }
  
  // Add dietary restrictions to keywords
  if (filters.dietary && filters.dietary.length > 0) {
    keywords.push(...filters.dietary);
  }
  
  return keywords.length > 0 ? keywords.join(' ') : undefined;
}

// Fetch restaurants from Google Places API
export async function fetchRestaurants(
  location: Location,
  radius: number = 1000,
  filters: FilterOptions = {}
): Promise<any[]> {
  try {
    // Build the URL for nearby search
    const keyword = buildKeywordString(filters);
    const baseUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    
    let url = `${baseUrl}?location=${location.lat},${location.lng}&radius=${radius}&type=restaurant&key=${apiKey}`;
    
    // Add keyword if available
    if (keyword) {
      url += `&keyword=${encodeURIComponent(keyword)}`;
    }
    
    // Add minprice and maxprice parameters if defined
    if (filters.priceLevel !== undefined) {
      url += `&minprice=${filters.priceLevel - 1 >= 0 ? filters.priceLevel - 1 : 0}`;
      url += `&maxprice=${filters.priceLevel}`;
    }
    
    // Make the request
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(`Google Places API error: ${data.status}`);
    }
    
    // Process results and add distance
    const results = data.results || [];
    return results.map((place: any) => {
      // Calculate distance
      const placeLocation = {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      };
      const distance = calculateDistance(location, placeLocation);
      
      return {
        ...place,
        distance
      };
    });
    
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    throw error;
  }
}

// Fetch details for a specific restaurant
export async function fetchRestaurantDetails(placeId: string): Promise<any> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,place_id,formatted_address,formatted_phone_number,geometry,opening_hours,photos,price_level,rating,reviews,types,user_ratings_total,website,vicinity&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(`Google Places API error: ${data.status}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    throw error;
  }
}
