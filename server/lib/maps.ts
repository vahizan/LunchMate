import fetch from 'node-fetch';

// Get Google Maps API key from environment variables
const apiKey = process.env.GOOGLE_MAPS_KEY || '';

// Type for location
interface Location {
  lat: number;
  lng: number;
}

// Type for travel information
interface TravelInfo {
  travel_time: number; // in minutes
  travel_distance: number; // in kilometers
  estimated_arrival_time: string; // ISO string
}

// Type for crowd information
interface CrowdInfo {
  crowd_level: 'busy' | 'moderate' | 'not_busy';
  peak_hours: Array<{
    day: string;
    hour: number;
    level: 'busy' | 'moderate' | 'not_busy';
  }>;
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
): Promise<{results: any[], cursor?: string}> {
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
    console.log('Fetching restaurants from Google Places API:', url);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(`Google Places API error: ${data.status}`);
    }
    
    // Process results and add distance
    const results = data.results || [];
    console.log(`Google Places API returned ${results.length} restaurants`);
    
    // For each place in the results, if it has a place_id but no photos,
    // fetch the details to get the photos
    const enhancedResults = await Promise.all(results.map(async (place: any) => {
      // Calculate distance
      const placeLocation = {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      };
      const distance = calculateDistance(location, placeLocation);
      
      // If the place doesn't have photos, fetch details to get photos
      if (!place.photos || place.photos.length === 0) {
        try {
          console.log(`Fetching photos for restaurant: ${place.name} (${place.place_id})`);
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=photos&key=${apiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          if (detailsData.status === 'OK' && detailsData.result && detailsData.result.photos) {
            place.photos = detailsData.result.photos;
            console.log(`Successfully fetched ${detailsData.result.photos.length} photos for ${place.name}`);
          } else {
            console.log(`No photos found for ${place.name} in details response`);
          }
        } catch (error) {
          console.error(`Error fetching photos for place ${place.place_id}:`, error);
          // Continue without photos if there's an error
        }
      } else {
        console.log(`Restaurant ${place.name} already has ${place.photos.length} photos from nearby search`);
      }
      
      return {
        ...place,
        distance
      };
    }));
    
    return {
     results: enhancedResults,
     cursor: undefined,
    };
    
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    throw error;
  }
}

// Fetch details for a specific restaurant
export async function fetchRestaurantDetails(placeId: string): Promise<any> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,place_id,formatted_address,formatted_phone_number,geometry,opening_hours,photos,price_level,rating,reviews,types,user_ratings_total,website,vicinity,current_popularity,popular_times&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(`Google Places API error: ${data.status}`);
    }
    
    // Fetch crowd information for this restaurant
    let crowdInfo = null;
    try {
      crowdInfo = await fetchCrowdInformation(placeId);
    } catch (crowdError) {
      console.warn(`Could not fetch crowd information for ${placeId}:`, crowdError);
    }
    
    // Merge crowd information with restaurant details
    const result = {
      ...data.result,
      ...(crowdInfo && {
        crowd_level: crowdInfo.crowd_level,
        peak_hours: crowdInfo.peak_hours
      })
    };
    
    return result;
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    throw error;
  }
}

/**
 * Calculate travel information between origin and destination using Google Maps Distance Matrix API
 * @param origin Origin location (user's location)
 * @param destination Destination location (restaurant location)
 * @param departureTime Optional departure time as ISO string
 * @returns Travel information including time, distance, and estimated arrival time
 */
export async function calculateTravelInfo(
  origin: Location,
  destination: Location,
  departureTime?: string
): Promise<TravelInfo | null> {
  try {
    // Format locations for the API
    const originStr = `${origin.lat},${origin.lng}`;
    const destinationStr = `${destination.lat},${destination.lng}`;
    
    // Build the URL for Distance Matrix API
    let url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destinationStr}&key=${apiKey}`;
    
    // Add departure time if provided
    if (departureTime) {
      // Parse the HH:MM time string
      const [hours, minutes] = departureTime.split(':').map(Number);
      
      // Create a date object for today with the specified time
      const departureDate = new Date();
      departureDate.setHours(hours, minutes, 0, 0);
      
      // Convert to Unix timestamp (seconds since epoch)
      const departureTimestamp = Math.floor(departureDate.getTime() / 1000);
      
      url += `&departure_time=${departureTimestamp}`;
      url += '&traffic_model=best_guess';
    }
    
    // Make the request
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Google Distance Matrix API error:', data.status, data.error_message);
      return null;
    }
    
    // Extract travel information from response
    const element = data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      console.error('No route found between origin and destination');
      return null;
    }
    
    // Calculate travel time in minutes
    const travelTimeSeconds = departureTime
      ? element.duration_in_traffic.value
      : element.duration.value;
    const travelTimeMinutes = Math.ceil(travelTimeSeconds / 60);
    
    // Calculate travel distance in kilometers
    const travelDistanceMeters = element.distance.value;
    const travelDistanceKm = travelDistanceMeters / 1000;
    
    // Calculate estimated arrival time
    let now;
    if (departureTime) {
      // Use the same parsed hours and minutes from earlier
      const [hours, minutes] = departureTime.split(':').map(Number);
      now = new Date();
      now.setHours(hours, minutes, 0, 0);
    } else {
      now = new Date();
    }
    const arrivalTime = new Date(now.getTime() + (travelTimeSeconds * 1000));
    
    return {
      travel_time: travelTimeMinutes,
      travel_distance: parseFloat(travelDistanceKm.toFixed(1)),
      estimated_arrival_time: arrivalTime.toISOString()
    };
  } catch (error) {
    console.error('Error calculating travel info:', error);
    return null;
  }
}