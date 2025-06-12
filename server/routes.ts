import type { Express } from "express";
import { createServer, type Server } from "http";

// Import controllers
import { registerRestaurantRoutes } from "./controllers/restaurantsController";
import { registerUserRoutes } from "./controllers/usersController";
import { registerHistoryRoutes } from "./controllers/historyController";
import { registerFavoritesRoutes } from "./controllers/favoritesController";
import { registerTeamRoutes } from "./controllers/teamsController";
import { registerTeamSuggestionsRoutes } from "./controllers/teamSuggestionsController";
import { registerTeamVotesRoutes } from "./controllers/teamVotesController";
import { registerCrowdDataRoutes } from "./controllers/crowdDataController";
import { registerProxyRoutes } from "./controllers/proxy";

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("Registering all API routes...");
  
  // Register all routes from controllers
  registerRestaurantRoutes(app);
  registerUserRoutes(app);
  registerHistoryRoutes(app);
  registerFavoritesRoutes(app);
  registerTeamRoutes(app);
  registerTeamSuggestionsRoutes(app);
  registerTeamVotesRoutes(app);
  registerCrowdDataRoutes(app);
  registerProxyRoutes(app);
  
  console.log("All API routes registered successfully");

  const httpServer = createServer(app);
  return httpServer;
}
