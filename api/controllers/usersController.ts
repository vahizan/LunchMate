import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Create a new user
export async function createUser(req: Request, res: Response) {
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
}

// Register user routes
export function registerUserRoutes(app: any) {
  app.post("/api/users", createUser);
}