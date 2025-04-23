import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Add favorite
export async function addFavorite(req: Request, res: Response) {
  try {
    const favoriteSchema = z.object({
      userId: z.number().optional(),
      restaurantId: z.string(),
      restaurantData: z.record(z.any()),
    });

    const favoriteData = favoriteSchema.parse(req.body);
    const favorite = await storage.addFavorite(favoriteData);
    res.status(201).json(favorite);
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(400).json({ error: "Invalid favorite data" });
  }
}

// Get favorites
export async function getFavorites(req: Request, res: Response) {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const favorites = await storage.getFavorites(userId);
    res.json(favorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
}

// Remove favorite
export async function removeFavorite(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await storage.removeFavorite(parseInt(id));
    res.status(200).json({ message: "Favorite removed" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
}

// Register favorites routes
export function registerFavoritesRoutes(app: any) {
  app.post("/api/favorites", addFavorite);
  app.get("/api/favorites", getFavorites);
  app.delete("/api/favorites/:id", removeFavorite);
}