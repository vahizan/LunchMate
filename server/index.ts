import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ScraperService } from "./lib/scraper";
import { defaultProxyManager } from "./lib/proxy-manager";
import { Scheduler, ScrapingPriority } from "./lib/scheduler";
import { defaultCrowdDataRepository } from "./models/crowd-data";
import { scrapingConfig } from "./config/scraper-config";
import cron from "node-cron";

// Initialize scraping system components
const scraperService = new ScraperService(scrapingConfig.scraper, defaultProxyManager);
const scheduler = new Scheduler(scrapingConfig.scheduler, scraperService, defaultProxyManager);

// Initialize proxy manager
defaultProxyManager.initialize().catch(error => {
  console.error("Failed to initialize proxy manager:", error);
  // Continue even if proxy initialization fails
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Start the scheduler
  scheduler.start();
  console.log("Web scraping scheduler started");

  // Schedule regular cleanup of expired crowd data
  cron.schedule(scrapingConfig.crowdDataRepository.cleanupInterval, async () => {
    try {
      const deletedCount = await defaultCrowdDataRepository.deleteExpiredData();
      console.log(`Cleaned up ${deletedCount} expired crowd data records`);
    } catch (error) {
      console.error("Failed to clean up expired crowd data:", error);
    }
  });

  // Schedule popular restaurants for regular updates
  try {
    // In a real implementation, you would fetch popular restaurants from your database
    // For now, we'll use a placeholder approach with some example restaurants
    const popularRestaurants = [
      { id: "popular1", name: "Popular Restaurant 1", popularity: 90 },
      { id: "popular2", name: "Popular Restaurant 2", popularity: 85 },
      { id: "popular3", name: "Popular Restaurant 3", popularity: 80 },
    ];
    
    scheduler.schedulePopularRestaurants(popularRestaurants);
    console.log(`Scheduled regular updates for ${popularRestaurants.length} popular restaurants`);
  } catch (error) {
    console.error("Failed to schedule popular restaurants:", error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Handle graceful shutdown
  const gracefulShutdown = async () => {
    console.log("Shutting down server...");
    
    // Stop the scheduler
    scheduler.stop();
    console.log("Web scraping scheduler stopped");
    
    // Close the scraper browser
    await scraperService.closeBrowser();
    console.log("Scraper browser closed");
    
    // Close the server
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
    
    // Force exit after timeout
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  // Listen for termination signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
})();
