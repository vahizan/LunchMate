import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { fetchRestaurants, fetchRestaurantDetails } from "./lib/maps";

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoints for restaurants
  app.get("/api/restaurants", async (req: Request, res: Response) => {
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
      };

      const location = locationSchema.parse(queryParams);
      const validatedFilters = filtersSchema.parse(filters);

      const restaurants = await fetchRestaurants(
        { lat: location.lat, lng: location.lng },
        location.radius ? location.radius * 1000 : 1000, // Convert km to meters
        validatedFilters
      );

      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      res.status(400).json({ error: "Invalid request parameters" });
    }
  });

  app.get("/api/restaurants/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Restaurant ID is required" });
      }

      const restaurant = await fetchRestaurantDetails(id);
      
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching restaurant details:", error);
      res.status(500).json({ error: "Failed to fetch restaurant details" });
    }
  });

  // API endpoints for user profiles
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userSchema = z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().optional(),
        email: z.string().email().optional(),
        defaultLocation: z.object({
          address: z.string(),
          lat: z.number(),
          lng: z.number(),
        }).optional(),
        favoriteCuisines: z.array(z.string()).optional(),
      });

      const userData = userSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  // API endpoints for visit history
  app.post("/api/history", async (req: Request, res: Response) => {
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
  });

  app.get("/api/history", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const history = await storage.getHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.delete("/api/history/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.removeFromHistory(parseInt(id));
      res.status(200).json({ message: "History item removed" });
    } catch (error) {
      console.error("Error removing from history:", error);
      res.status(500).json({ error: "Failed to remove history item" });
    }
  });

  // API endpoints for favorites
  app.post("/api/favorites", async (req: Request, res: Response) => {
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
  });

  app.get("/api/favorites", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const favorites = await storage.getFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.delete("/api/favorites/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.removeFavorite(parseInt(id));
      res.status(200).json({ message: "Favorite removed" });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // API endpoints for teams
  app.post("/api/teams", async (req: Request, res: Response) => {
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
  });

  app.get("/api/teams", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const teams = await storage.getTeams(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req: Request, res: Response) => {
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
  });

  // API endpoints for team suggestions
  app.post("/api/team/suggestions", async (req: Request, res: Response) => {
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
  });

  // API endpoints for team votes
  app.post("/api/team/vote", async (req: Request, res: Response) => {
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
  });

  // Mock data endpoint for demo purposes
  app.get("/api/team", (req: Request, res: Response) => {
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
  });

  const httpServer = createServer(app);
  return httpServer;
}
