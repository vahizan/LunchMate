import { Request, Response } from "express";

// Track server start time for uptime calculation
const serverStartTime = new Date();

/**
 * Health check endpoint
 * Returns basic health information about the API
 */
export async function getHealthStatus(req: Request, res: Response) {
  try {
    // Calculate uptime in seconds
    const uptime = Math.floor((new Date().getTime() - serverStartTime.getTime()) / 1000);
    
    // Get environment
    const environment = process.env.NODE_ENV || 'development';
    
    // Prepare health response
    const healthData = {
      status: 'healthy',
      uptime: uptime,
      timestamp: new Date().toISOString(),
      environment: environment,
      version: process.env.npm_package_version || '1.0.0',
    };
    
    res.status(200).json(healthData);
  } catch (error) {
    console.error("Error in health check:", error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to retrieve health information'
    });
  }
}

/**
 * Register health routes
 */
export function registerHealthRoutes(app: any) {
  // Health endpoint - public, no authentication required
  app.get("/health", getHealthStatus);
}