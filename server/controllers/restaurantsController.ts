import { Request, Response } from "express";
import { z } from "zod";
import { fetchRestaurants as fetchGoogleRestaurants, fetchRestaurantDetails as fetchGoogleRestaurantDetails } from "../lib/maps";
import {
  fetchRestaurants as fetchFoursquareRestaurants,
  fetchRestaurantDetails as fetchFoursquareRestaurantDetails,
  fetchPlaceImages as fetchFoursquareImages
} from "../lib/foursquare";

// Get all restaurants
export async function getRestaurants(req: Request, res: Response) {
  try {
    const locationSchema = z.object({
      lat: z.number().or(z.string().transform(s => parseFloat(s))),
      lng: z.number().or(z.string().transform(s => parseFloat(s))),
      radius: z.number().or(z.string().transform(s => parseFloat(s))).optional(),
    });

    const filtersSchema = z.object({
      cuisines: z.array(z.string()).optional(),
      dietary: z.array(z.string()).optional(),
      priceLevel: z.number().optional(),
      excludeChains: z.boolean().optional(),
      page: z.number().or(z.string().transform(s => parseInt(s))).optional(),
      pageSize: z.number().or(z.string().transform(s => parseInt(s))).optional(),
    });

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
      excludeChains: req.query.excludeChains === 'true',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 10,
    };

    const location = locationSchema.parse(queryParams);
    const validatedFilters = filtersSchema.parse(filters);

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
          validatedFilters
        )
    );

    // Apply pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Get total count before pagination
    const totalCount = restaurants.length;
    
    // Paginate the results
    const paginatedRestaurants = restaurants.slice(startIndex, endIndex);
    
    res.json({
      results: paginatedRestaurants,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasMore: endIndex < totalCount
      }
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

    // Determine which API to use based on environment variable
    const useGoogleMaps = process.env.PLACES_PROVIDER === 'google';
    
    const restaurant = await (useGoogleMaps
      ? fetchGoogleRestaurantDetails(id)
      : fetchFoursquareRestaurantDetails(id)
    );
    
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
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

// Register restaurant routes
export function registerRestaurantRoutes(app: any) {
  app.get("/api/restaurants", getRestaurants);
  app.get("/api/restaurants/:id", getRestaurantById);
  app.get("/api/restaurants/:id/images", getRestaurantImages);
}