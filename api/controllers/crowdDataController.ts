import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authenticate } from "../middleware/auth";
import { ScraperService, CrowdLevelData } from "../lib/scraper";
import { insertCrowdDataSchema } from "@shared/schema";

// Validate crowd data input
const crowdDataSchema = insertCrowdDataSchema.extend({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  restaurantName: z.string().min(1, "Restaurant name is required"),
  crowdLevel: z.enum(["busy", "moderate", "not_busy", "unknown"]),
});

// Get crowd data for a specific restaurant
export async function getCrowdData(req: Request, res: Response) {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant ID is required" });
    }

    // Try to get from database first
    const cachedData = await storage.getCrowdData(restaurantId);
    
    if (cachedData) {
      // Check if data is stale (older than 24 hours)
      const now = new Date();
      const lastUpdated = new Date(cachedData.lastUpdated);
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        return res.json({
          success: true,
          data: cachedData,
          source: "cache"
        });
      }
    }

    // If no cached data or data is stale, try to fetch fresh data
    if (req.query.restaurantName) {
      const restaurantName = req.query.restaurantName.toString();
      const address = req.query.address?.toString() || "";
      
      console.log(`Fetching fresh crowd data for ${restaurantName}`);
      
      const crowdResult = await ScraperService.getInstance().extractCrowdLevelData(
        restaurantName,
        address,
        1
      );
      
      if (crowdResult.success && crowdResult.data) {
        // Save to database
        const savedData = await storage.saveCrowdData({
          restaurantId,
          restaurantName,
          crowdLevel: crowdResult.data.crowdLevel,
          crowdPercentage: crowdResult.data.crowdPercentage,
          peakHours: crowdResult.data.peakHours,
          averageTimeSpent: crowdResult.data.averageTimeSpent || "unknown",
          source: crowdResult.data.source
        });
        
        return res.json({
          success: true,
          data: savedData,
          source: "fresh"
        });
      }
    }
    
    // If we have cached data but it's stale, return it anyway
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        source: "stale_cache"
      });
    }
    
    // No data available
    return res.status(404).json({
      success: false,
      error: "Crowd data not available for this restaurant"
    });
  } catch (error) {
    console.error("Error fetching crowd data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch crowd data"
    });
  }
}

// Get all crowd data (for admin/debugging purposes)
export async function getAllCrowdData(req: Request, res: Response) {
  try {
    const allData = await storage.getAllCrowdData();
    res.json({
      success: true,
      data: allData,
      count: allData.length
    });
  } catch (error) {
    console.error("Error fetching all crowd data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch crowd data"
    });
  }
}

// Save or update crowd data (protected endpoint)
export async function saveCrowdData(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData = crowdDataSchema.parse(req.body);
    
    // Check if data already exists
    const existingData = await storage.getCrowdData(validatedData.restaurantId);
    
    let result;
    if (existingData) {
      // Update existing data
      result = await storage.updateCrowdData(validatedData.restaurantId, validatedData);
    } else {
      // Save new data
      result = await storage.saveCrowdData(validatedData);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error saving crowd data:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid input data",
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to save crowd data"
    });
  }
}

// Register crowd data routes
export function registerCrowdDataRoutes(app: any) {
  // Public endpoints (no authentication required)
  app.get("/api/crowd-data/:restaurantId", getCrowdData);
  app.get("/api/crowd-data", getAllCrowdData);
  
  // Protected endpoint (requires authentication)
  app.post("/api/crowd-data", authenticate, saveCrowdData);
  app.put("/api/crowd-data/:restaurantId", authenticate, saveCrowdData);
}