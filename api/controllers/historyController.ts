import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Add to history
export async function addToHistory(req: Request, res: Response) {
  try {
    const historySchema = z.object({
      userId: z.number().optional(),
      restaurantId: z.string(),
      restaurantName: z.string(),
    });

    const historyData = historySchema.parse(req.body);
    const history = await storage.addToHistory(historyData);
    res.status(201).json(history);
  } catch (error) {
    console.error("Error adding to history:", error);
    res.status(400).json({ error: "Invalid history data" });
  }
}

// Get history
export async function getHistory(req: Request, res: Response) {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const history = await storage.getHistory(userId);
    res.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
}

// Remove from history
export async function removeFromHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await storage.removeFromHistory(parseInt(id));
    res.status(200).json({ message: "History item removed" });
  } catch (error) {
    console.error("Error removing from history:", error);
    res.status(500).json({ error: "Failed to remove history item" });
  }
}

// Register history routes
export function registerHistoryRoutes(app: any) {
  app.post("/api/history", addToHistory);
  app.get("/api/history", getHistory);
  app.delete("/api/history/:id", removeFromHistory);
}