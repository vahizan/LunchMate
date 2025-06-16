import express, { Request, Response, NextFunction } from "express";
import { log, serveStatic, setupVite } from "./vite";
import { registerRoutes } from "./routes";
import { scrapingConfig } from "./config/scraper-config";
import { ScraperService } from "./lib/scraper";
import 'dotenv/config';

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
  // Initialize the ScraperService singleton with credentials from .env

  // Initialize the ScraperService with credentials from Secrets Manager or environment variables
  const secretsManager = (await import('./lib/secrets-manager')).default;
  
  try {
    // In production, get credentials from Secrets Manager
    if (process.env.NODE_ENV === 'prod') {
      const oxyLabsUsername = 'lunchmate_BbFPS';
      const oxyLabsPassword = await secretsManager.getSecret('OXYLABS_PASSWORD', 'SCRAPE_OXYLABS_PASS');
      
      ScraperService.getInstance({
        oxyLabsUsername,
        oxyLabsPassword
      });
    } else {
      // In development, use environment variables
      ScraperService.getInstance({
        oxyLabsUsername: process.env.OXYLABS_USERNAME || 'lunchmate_BbFPS', // Fallback for local development
        oxyLabsPassword: process.env.SCRAPE_OXYLABS_PASS
      });
    }
  } catch (error) {
    console.error('Failed to initialize ScraperService with credentials:', error);
    throw error;
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
  if (process.env.NODE_ENV !== 'prod') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });

  // Handle graceful shutdown
  const gracefulShutdown = async () => {
    console.log("Shutting down server...");
    
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
