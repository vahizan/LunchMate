import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Add team vote
export async function addTeamVote(req: Request, res: Response) {
  try {
    const voteSchema = z.object({
      suggestionId: z.number(),
      userId: z.number(),
    });

    const voteData = voteSchema.parse(req.body);
    const vote = await storage.addTeamVote(voteData);
    res.status(201).json(vote);
  } catch (error) {
    console.error("Error adding team vote:", error);
    res.status(400).json({ error: "Invalid vote data" });
  }
}

// Register team votes routes
export function registerTeamVotesRoutes(app: any) {
  app.post("/api/team/vote", addTeamVote);
}