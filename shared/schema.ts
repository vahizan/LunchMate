import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  defaultLocation: jsonb("default_location"),
  favoriteCuisines: text("favorite_cuisines").array(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Visit history table
export const visitHistory = pgTable("visit_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  restaurantId: text("restaurant_id").notNull(),
  restaurantName: text("restaurant_name").notNull(),
  visitDate: timestamp("visit_date").defaultNow().notNull(),
});

// Favorites table
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  restaurantId: text("restaurant_id").notNull(),
  restaurantData: jsonb("restaurant_data").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Team members table
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id),
  userId: integer("user_id").references(() => users.id),
  joined_at: timestamp("joined_at").defaultNow().notNull(),
});

// Team suggestions table
export const teamSuggestions = pgTable("team_suggestions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id),
  restaurantId: text("restaurant_id").notNull(),
  restaurantData: jsonb("restaurant_data").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Team votes table
export const teamVotes = pgTable("team_votes", {
  id: serial("id").primaryKey(),
  suggestionId: integer("suggestion_id").references(() => teamSuggestions.id),
  userId: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  defaultLocation: true,
  favoriteCuisines: true,
});

export const insertVisitHistorySchema = createInsertSchema(visitHistory).pick({
  userId: true,
  restaurantId: true,
  restaurantName: true,
  visitDate: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).pick({
  userId: true,
  restaurantId: true,
  restaurantData: true,
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  createdBy: true,
  inviteCode: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  userId: true,
});

export const insertTeamSuggestionSchema = createInsertSchema(teamSuggestions).pick({
  teamId: true,
  restaurantId: true,
  restaurantData: true,
});

export const insertTeamVoteSchema = createInsertSchema(teamVotes).pick({
  suggestionId: true,
  userId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertVisitHistory = z.infer<typeof insertVisitHistorySchema>;
export type VisitHistory = typeof visitHistory.$inferSelect;

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertTeamSuggestion = z.infer<typeof insertTeamSuggestionSchema>;
export type TeamSuggestion = typeof teamSuggestions.$inferSelect;

export type InsertTeamVote = z.infer<typeof insertTeamVoteSchema>;
export type TeamVote = typeof teamVotes.$inferSelect;
