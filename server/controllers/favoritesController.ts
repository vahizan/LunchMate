import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authenticate } from "../middleware/auth";

// Validation schemas
const favoriteSchema = z.object({
  restaurantId: z.string(),
  restaurantData: z.record(z.any()),
});

// Add favorite
export async function addFavorite(req: Request, res: Response) {
  try {
    // User ID is guaranteed by the authenticate middleware
    const userId = req.user!.id;
    
    const favoriteData = favoriteSchema.parse(req.body);
    
    // Check if favorite already exists
    const existingFavorites = await storage.getFavorites(userId);
    const alreadyExists = existingFavorites.some(
      fav => fav.restaurantId === favoriteData.restaurantId
    );
    
    if (alreadyExists) {
      return res.status(409).json({ 
        error: "Restaurant already in favorites",
        message: "This restaurant is already in your favorites"
      });
    }
    
    // Add to favorites
    const favorite = await storage.addFavorite({
      userId,
      restaurantId: favoriteData.restaurantId,
      restaurantData: favoriteData.restaurantData,
    });
    
    res.status(201).json(favorite);
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(400).json({ error: "Invalid favorite data" });
  }
}

// Get user favorites
export async function getFavorites(req: Request, res: Response) {
  try {
    // User ID is guaranteed by the authenticate middleware
    const userId = req.user!.id;
    
    const favorites = await storage.getFavorites(userId);
    res.json(favorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
}

// Remove favorite by restaurant ID
export async function removeFavoriteByRestaurantId(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { restaurantId } = req.params;
    
    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant ID is required" });
    }
    
    // Find the favorite with the given restaurant ID for this user
    const favorites = await storage.getFavorites(userId);
    const favorite = favorites.find(f => f.restaurantId === restaurantId);
    
    if (!favorite) {
      return res.status(404).json({ error: "Favorite not found" });
    }
    
    // Remove the favorite
    await storage.removeFavorite(favorite.id);
    res.status(200).json({ message: "Favorite removed successfully" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
}

// Remove favorite by ID
export async function removeFavorite(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const favoriteId = parseInt(id);
    
    if (isNaN(favoriteId)) {
      return res.status(400).json({ error: "Invalid favorite ID" });
    }
    
    // Verify the favorite belongs to the user
    const favorites = await storage.getFavorites(userId);
    const favorite = favorites.find(f => f.id === favoriteId);
    
    if (!favorite) {
      return res.status(404).json({ error: "Favorite not found" });
    }
    
    await storage.removeFavorite(favoriteId);
    res.status(200).json({ message: "Favorite removed successfully" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
}

// Register favorites routes
export function registerFavoritesRoutes(app: any) {
  // Protected routes - require authentication
  app.post("/api/favorites", authenticate, addFavorite);
  app.get("/api/favorites", authenticate, getFavorites);
  app.delete("/api/favorites/:id", authenticate, removeFavorite);
  app.delete("/api/favorites/restaurant/:restaurantId", authenticate, removeFavoriteByRestaurantId);
}