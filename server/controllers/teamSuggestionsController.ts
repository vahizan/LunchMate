import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Add team suggestion
export async function addTeamSuggestion(req: Request, res: Response) {
  try {
    const suggestionSchema = z.object({
      teamId: z.number(),
      restaurantId: z.string(),
      restaurantData: z.record(z.any()),
    });

    const suggestionData = suggestionSchema.parse(req.body);
    const suggestion = await storage.addTeamSuggestion(suggestionData);
    res.status(201).json(suggestion);
  } catch (error) {
    console.error("Error adding team suggestion:", error);
    res.status(400).json({ error: "Invalid suggestion data" });
  }
}

// Register team suggestions routes
export function registerTeamSuggestionsRoutes(app: any) {
  app.post("/api/team/suggestions", addTeamSuggestion);
}