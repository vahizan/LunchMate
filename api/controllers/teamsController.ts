import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Create team
export async function createTeam(req: Request, res: Response) {
  try {
    const teamSchema = z.object({
      name: z.string(),
      createdBy: z.number(),
    });

    const teamData = teamSchema.parse(req.body);
    const team = await storage.createTeam({
      ...teamData, 
      inviteCode: Math.random().toString(36).substring(2, 10)
    });
    
    res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(400).json({ error: "Invalid team data" });
  }
}

// Get teams
export async function getTeams(req: Request, res: Response) {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const teams = await storage.getTeams(userId);
    res.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
}

// Get team by ID
export async function getTeamById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const team = await storage.getTeam(parseInt(id));
    
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    
    res.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ error: "Failed to fetch team" });
  }
}

// Get mock team data (for demo purposes)
export function getMockTeam(req: Request, res: Response) {
  // Return a sample team for demo
  const sampleTeam = {
    id: 1,
    name: "Tech Team",
    createdBy: 1,
    members: ["John Doe", "Jane Smith", "Alex Johnson", "Sam Wilson"],
    suggestions: [
      { restaurantId: "place1", votes: ["user1", "user2", "user3"] },
      { restaurantId: "place2", votes: ["user4"] },
    ]
  };
  
  res.json(sampleTeam);
}

// Register team routes
export function registerTeamRoutes(app: any) {
  app.post("/api/teams", createTeam);
  app.get("/api/teams", getTeams);
  app.get("/api/teams/:id", getTeamById);
  app.get("/api/team", getMockTeam); // Mock data endpoint
}