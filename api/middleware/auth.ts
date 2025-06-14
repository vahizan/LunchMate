import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * This middleware checks for a user ID in the request headers
 * In a real-world application, this would validate a JWT token or session
 */
export const authenticate = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Get user ID from request header
    const userId = req.headers["user-id"];
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Convert to number and validate
    const userIdNum = parseInt(userId as string);
    if (isNaN(userIdNum)) {
      return res.status(401).json({ error: "Invalid user ID" });
    }
    
    // Get user from storage
    const user = await storage.getUser(userIdNum);
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Attach user to request object
    req.user = {
      id: user.id,
      username: user.username
    };
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};