import { Request, Response } from "express";
import { z } from "zod";
import {
  fetchRestaurants as fetchGoogleRestaurants,
  fetchRestaurantDetails as fetchGoogleRestaurantDetails,
  calculateTravelInfo,
} from "../lib/maps";
import { ScraperService, CrowdLevelData } from "../lib/scraper";
import {
  fetchRestaurants as fetchFoursquareRestaurants,
  fetchRestaurantDetails as fetchFoursquareRestaurantDetails,
  fetchPlaceImages as fetchFoursquareImages
} from "../lib/foursquare";
import { calculateDistance } from "../lib/foursquare.utils";
import { Location } from "@/types";


const querySchema = z.object({
  cuisines: z.array(z.string()).optional(),
  dietary: z.array(z.string()).optional(),
  priceLevel: z.number().optional(),
  excludeChains: z.boolean().optional(),
  excludeCafe: z.boolean().optional(),
  cursor: z.string().optional(),
  departureTime: z.string().optional(),
});


// Get all restaurant IDs
export async function getRestaurantIds(req: Request, res: Response) {
  const locationSchema = z.object({
    lat: z.number().or(z.string().transform(s => parseFloat(s))),
    lng: z.number().or(z.string().transform(s => parseFloat(s))),
    radius: z.number().or(z.string().transform(s => parseFloat(s))).optional(),
    fieldsToFetch: z.string().optional(),
  });
  
  try {
    const queryParams = {
      lat: req.query.lat,
      lng: req.query.lng,
      radius: req.query.radius || 1000,
      fieldsToFetch: 'fsq_id',
    };

    const filters = {
      cuisines: req.query.cuisines ?
        Array.isArray(req.query.cuisines)
          ? req.query.cuisines
          : [req.query.cuisines as string]
        : [],
      dietary: req.query.dietary ?
        Array.isArray(req.query.dietary)
          ? req.query.dietary
          : [req.query.dietary as string]
        : [],
      priceLevel: req.query.priceLevel ? parseInt(req.query.priceLevel as string) : undefined,
      excludeChains: Boolean(req.query.excludeChains),
      excludeCafe: Boolean(req.query.excludeCafe),
    };

    const location = locationSchema.parse(queryParams);
    const validatedFilters = querySchema.parse(filters);

    // Determine which API to use based on environment variable
    // Default to Foursquare if not specified
    const useGoogleMaps = process.env.PLACES_PROVIDER === 'google';
    
    console.log(`Using ${useGoogleMaps ? 'Google Maps' : 'Foursquare'} API for restaurant ID search`);
    
    console.log('req.query.cursor', req.query.cursor);
    // For Google Maps, we don't have a way to fetch only IDs, so we'll use the regular function
    // For Foursquare, we'll use the modified function with fieldsToFetch parameter
    const restaurants = await (useGoogleMaps
      ? fetchGoogleRestaurants(
          { lat: location.lat, lng: location.lng },
          location.radius ? location.radius * 1000 : 1000, // Convert km to meters
          validatedFilters
        )
      : fetchFoursquareRestaurants(
          { lat: location.lat, lng: location.lng },
          location.radius ? location.radius * 1000 : 1000, // Convert km to meters
          validatedFilters,
          location.fieldsToFetch, // Only fetch the specified fields
          req.query.pageSize?.toString(),
          req?.query?.cursor?.toString()
        )
    );

    // For Foursquare, we only need to extract the fsq_id
    // For Google Maps, we need to extract the place_id
    const results = restaurants.results.map(restaurant => ({
      fsq_id: restaurant.place_id || restaurant.fsq_id
    }));
    
    res.json({
      results,
      cursor: restaurants.cursor,
      count: results.length
    });
  } catch (error) {
    console.error("Error fetching restaurant IDs:", error);
    res.status(400).json({ error: "Invalid request parameters" });
  }
}

const locationSchema = z.object({
  lat: z.number().or(z.string().transform(s => parseFloat(s))),
  lng: z.number().or(z.string().transform(s => parseFloat(s))),
  radius: z.number().or(z.string().transform(s => parseFloat(s))).optional(),
});

// Get all restaurants
export async function getRestaurants(req: Request, res: Response) {
  try {
  
    const queryParams = {
      lat: req.query.lat,
      lng: req.query.lng,
      radius: req.query.radius || 1000,
    };

    const filters = {
      cuisines: req.query.cuisines ?
        Array.isArray(req.query.cuisines)
          ? req.query.cuisines
          : [req.query.cuisines as string]
        : [],
      dietary: req.query.dietary ?
        Array.isArray(req.query.dietary)
          ? req.query.dietary
          : [req.query.dietary as string]
        : [],
      priceLevel: req.query.priceLevel ? parseInt(req.query.priceLevel as string) : undefined,
      excludeChains: Boolean(req.query.excludeChains),
      excludeCafe: Boolean(req.query.excludeCafe),
      cursor: req.query.cursor ? req.query.cursor : undefined,
      departureTime: req.query.departureTime ? req.query.departureTime.toString() : undefined,
    };

    const location = locationSchema.parse(queryParams);
    const validatedFilters = querySchema.parse(filters);

    // Determine which API to use based on environment variable
    // Default to Foursquare if not specified
    const useGoogleMaps = process.env.PLACES_PROVIDER === 'google';
    
    console.log(`Using ${useGoogleMaps ? 'Google Maps' : 'Foursquare'} API for restaurant search`);
    
    const restaurants = await (useGoogleMaps
      ? fetchGoogleRestaurants(
          { lat: location.lat, lng: location.lng },
          location.radius ? location.radius * 1000 : 1000, // Convert km to meters
          validatedFilters
        )
      : fetchFoursquareRestaurants(
          { lat: location.lat, lng: location.lng },
          location.radius ? location.radius * 1000 : 1000, // Convert km to meters
          validatedFilters,
          undefined,
          req.query.pageSize?.toString(),
          req.query.cursor?.toString()
        )
    );
    
    // Process restaurants to add additional information
    // Process restaurants in parallel with Promise.all
    const enhancedResults = await Promise.all(
      restaurants.results.map(async (restaurant) => {
        let enhancedRestaurant = { ...restaurant };
        
        // Skip if restaurant doesn't have location data
        if (!restaurant.geometry?.location) {
          return enhancedRestaurant;
        }
        
        // Calculate travel info if departure time is provided
        if (validatedFilters.departureTime) {
          console.log(`Calculating travel info with departure time: ${validatedFilters.departureTime}`);
          
          const travelInfo = await calculateTravelInfo(
            { lat: location.lat, lng: location.lng },
            {
              lat: restaurant.geometry.location.lat,
              lng: restaurant.geometry.location.lng
            },
            validatedFilters.departureTime
          );
          
          // Add travel info to restaurant if available
          if (travelInfo) {
            enhancedRestaurant = {
              ...enhancedRestaurant,
              travel_time: travelInfo.travel_time,
              travel_distance: travelInfo.travel_distance,
              estimated_arrival_time: travelInfo.estimated_arrival_time
            };
          }
        }
        
        return enhancedRestaurant;
      })
    );
    
    // Replace original results with enhanced results
    restaurants.results = enhancedResults;
    
    res.json({
      results: restaurants?.results,
      cursor: restaurants?.cursor,
      size: restaurants.results.length
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    res.status(400).json({ error: "Invalid request parameters" });
  }
}

// Get restaurant by ID
export async function getRestaurantById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Restaurant ID is required" });
    }
  
    let location: Location|undefined = undefined;
    if(req.query?.lat && req.query?.lng){
      location = locationSchema.parse(req.query) as Location;
    }

    // Get departure time if provided
    const departureTime = req.query.departureTime ? req.query.departureTime.toString() : undefined;

    // Determine which API to use based on environment variable
    const useGoogleMaps = process.env.PLACES_PROVIDER === 'google';
    
    const restaurant = await (useGoogleMaps
      ? fetchGoogleRestaurantDetails(id)
      : fetchFoursquareRestaurantDetails(id, location)
    );
    
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    // Enhance restaurant with additional information
    
    // Calculate travel info if both location and departure time are provided
    if (location && departureTime && restaurant.geometry?.location) {
      const travelInfo = await calculateTravelInfo(
        { lat: location.lat, lng: location.lng },
        {
          lat: restaurant.geometry.location.lat,
          lng: restaurant.geometry.location.lng
        },
        departureTime
      );
      
      // Add travel info to restaurant if available
      if (travelInfo) {
        restaurant.travel_time = travelInfo.travel_time;
        restaurant.travel_distance = travelInfo.travel_distance;
        restaurant.estimated_arrival_time = travelInfo.estimated_arrival_time;
      }
    }

    // Calculate distance if location is provided but not already set
    if (location && restaurant.geometry?.location && !restaurant.distance) {
      restaurant.distance = calculateDistance(
        { lat: location.lat, lng: location.lng },
        {
          lat: restaurant.geometry.location.lat,
          lng: restaurant.geometry.location.lng
        }
      );
    }

    // Fetch crowd level data if restaurant name is available
    if (restaurant.name) {
      try {
        const crowdResult = await ScraperService.getInstance().extractCrowdLevelData(
          restaurant.name,
          restaurant.formatted_address || ""
        );
        
        if (crowdResult.success && crowdResult.data) {
          const crowdData = crowdResult.data;
          if (crowdData.crowdLevel !== 'unknown') {
            restaurant.crowd_level = crowdData.crowdLevel;
            restaurant.peak_hours = crowdData.peakHours;
            restaurant.averageTimeSpent = crowdData.averageTimeSpent;
          }
        }
      } catch (error) {
        console.error("Error fetching crowd level data:", error);
        // Continue without crowd data if there's an error
      }
    }

    res.json(restaurant);
  } catch (error) {
    console.error("Error fetching restaurant details:", error);
    res.status(500).json({ error: "Failed to fetch restaurant details" });
  }
}

// Get restaurant images by ID
export async function getRestaurantImages(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Restaurant ID is required" });
    }

    // Determine which API to use based on environment variable
    const useGoogleMaps = process.env.PLACES_PROVIDER === 'google';
    
    if (useGoogleMaps) {
      // Google Maps API doesn't have a dedicated endpoint for images
      // We could fetch place details and extract photos, but for now return an error
      return res.status(501).json({
        error: "Image fetching not implemented for Google Maps API",
        message: "Set PLACES_PROVIDER=foursquare to use Foursquare for image fetching"
      });
    } else {
      // Use Foursquare API to fetch images
      const images = await fetchFoursquareImages(id);
      res.json({ images });
    }
  } catch (error) {
    console.error("Error fetching restaurant images:", error);
    res.status(500).json({ error: "Failed to fetch restaurant images" });
  }
}

// Get crowd level data for a restaurant
export async function getCrowdLevelData(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Restaurant ID is required" });
    }


    // Call the scraper service to extract crowd level data
    console.log(`Extracting crowd level data for restaurant: ${req.query.restaurantName}`);
    const crowdData = await ScraperService.getInstance().extractCrowdLevelData(req.query.restaurantName?.toString() || "", req.query.address?.toString() || "");
    
    res.json(crowdData);
  } catch (error) {
    console.error("Error fetching crowd level data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch crowd level data"
    });
  }
}

// Register restaurant routes
export function registerRestaurantRoutes(app: any) {
  app.get("/api/restaurants", getRestaurants);
  app.get("/api/restaurants/ids", getRestaurantIds);
  app.get("/api/restaurants/:id", getRestaurantById);
  app.get("/api/restaurants/:id/images", getRestaurantImages);
  app.get("/api/restaurants/:id/crowd-level", getCrowdLevelData);
}