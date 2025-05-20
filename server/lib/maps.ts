import fetch from 'node-fetch';

// Get Google Maps API key from environment variables
const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

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
    console.log('Fetching travel info from Google Distance Matrix API:', url);
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
    const now = departureTime ? new Date(departureTime) : new Date();
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

import { fetchCrowdLevelData } from './scraper';
import { defaultCrowdDataRepository } from '../models/crowd-data';
import { ScraperService } from './scraper';
import { defaultProxyManager } from './proxy-manager';
import { Scheduler, ScrapingPriority, ScrapingTarget } from './scheduler';
import { scrapingConfig } from '../config/scraper-config';

// Initialize scraper components
const scraperService = new ScraperService(scrapingConfig.scraper, defaultProxyManager);
const scheduler = new Scheduler(scrapingConfig.scheduler, scraperService, defaultProxyManager);

// Start the scheduler
scheduler.start();

/**
 * Fetch crowd information for a restaurant using the web scraping system
 * @param placeIdOrLocation The place ID of the restaurant or location coordinates
 * @returns Crowd information including current crowd level and peak hours
 */
export async function fetchCrowdInformation(placeIdOrLocation: string | Location): Promise<CrowdInfo | null> {
  try {
    let restaurantName: string | null = null;
    let location: string | null = null;
    
    // Check if we're using a place ID or location coordinates
    if (typeof placeIdOrLocation === 'string') {
      // Using place ID directly - we need to get the restaurant name
      // For now, we'll use the place ID as the restaurant ID for the database lookup
      const restaurantId = placeIdOrLocation;
      
      // Try to get crowd data from the repository first
      const crowdData = await defaultCrowdDataRepository.getLatestCrowdData(restaurantId);
      
      if (crowdData && new Date(crowdData.expiresAt) > new Date()) {
        console.log(`Using cached crowd data for restaurant ID ${restaurantId}`);
        
        // Convert from repository format to API format
        return {
          crowd_level: crowdData.crowdLevel as 'busy' | 'moderate' | 'not_busy',
          peak_hours: crowdData.peakHours as Array<{day: string; hour: number; level: 'busy' | 'moderate' | 'not_busy'}>
        };
      }
      
      // If we don't have cached data, we need to get the restaurant name
      // In a real implementation, you would fetch this from your database
      // For now, we'll use a placeholder approach
      restaurantName = `Restaurant ${restaurantId.substring(0, 8)}`;
      console.log(`No cached data found. Using placeholder name: ${restaurantName}`);
    } else {
      // Using location coordinates - construct a location string
      location = `${placeIdOrLocation.lat},${placeIdOrLocation.lng}`;
      restaurantName = `Restaurant at ${location}`;
      console.log(`Using location coordinates as identifier: ${location}`);
    }
    
    // If we have a restaurant name, try to scrape the data
    if (restaurantName) {
      console.log(`Fetching crowd information for ${restaurantName} using web scraper`);
      
      // Option 1: Direct scraping (synchronous)
      const result = await fetchCrowdLevelData(restaurantName, location || undefined);
      
      if (result.success && result.data) {
        const crowdData = result.data;
        
        // Store the data in the repository for future use
        try {
          await defaultCrowdDataRepository.storeCrowdData(crowdData);
          console.log(`Stored crowd data for ${restaurantName} in repository`);
        } catch (storageError) {
          console.error('Failed to store crowd data:', storageError);
          // Continue even if storage fails
        }
        
        // Convert from scraper format to API format
        return {
          crowd_level: crowdData.crowdLevel === 'unknown' ? 'moderate' : crowdData.crowdLevel,
          peak_hours: crowdData.peakHours || generateFallbackPeakHours()
        };
      }
      
      // Option 2: Schedule scraping for later (asynchronous)
      // This is useful for non-urgent requests or to build up the database
      const scrapingTarget: ScrapingTarget = {
        id: typeof placeIdOrLocation === 'string' ? placeIdOrLocation : `loc_${placeIdOrLocation.lat}_${placeIdOrLocation.lng}`,
        name: restaurantName,
        location: location || undefined
      };
      
      scheduler.scheduleJob(scrapingTarget, ScrapingPriority.MEDIUM);
      console.log(`Scheduled scraping job for ${restaurantName} for later processing`);
    }
    
    // If we couldn't get real data, provide fallback data
    console.log(`Using fallback crowd data for ${restaurantName || 'unknown restaurant'}`);
    return {
      crowd_level: 'moderate',
      peak_hours: generateFallbackPeakHours()
    };
  } catch (error) {
    console.error('Error fetching crowd information:', error);
    return null;
  }
}

/**
 * Generate fallback peak hours data based on common patterns
 * @returns Array of peak hours
 */
function generateFallbackPeakHours(): Array<{day: string; hour: number; level: 'busy' | 'moderate' | 'not_busy'}> {
  const peakHours: Array<{day: string; hour: number; level: 'busy' | 'moderate' | 'not_busy'}> = [];
  
  // Common busy times for restaurants: lunch (12-2pm) and dinner (6-8pm)
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const busyHours = [12, 13, 18, 19, 20];
  const weekendBusyHours = [11, 12, 13, 14, 18, 19, 20, 21];
  
  daysOfWeek.forEach(day => {
    const isWeekend = day === 'Saturday' || day === 'Sunday';
    const hoursToUse = isWeekend ? weekendBusyHours : busyHours;
    
    hoursToUse.forEach(hour => {
      // Make weekend evenings busier
      const level = (isWeekend && hour >= 18) ? 'busy' : 'moderate';
      peakHours.push({ day, hour, level });
    });
  });
  
  return peakHours;
}
