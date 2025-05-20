import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { CrowdLevelData } from "../lib/scraper";
import { config } from "dotenv";
import { eq, desc, lt, like, inArray, SQL, sql } from "drizzle-orm";

// Load environment variables
config();

// Define the crowd data table schema
export const crowdData = pgTable("crowd_data", {
  id: serial("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  restaurantName: text("restaurant_name").notNull(),
  crowdLevel: text("crowd_level").notNull(), // 'busy', 'moderate', 'not_busy', 'unknown'
  crowdPercentage: integer("crowd_percentage"),
  peakHours: jsonb("peak_hours"),
  lastUpdated: timestamp("last_updated").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  source: text("source").notNull().default("google"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Create insert schema for validation
export const insertCrowdDataSchema = createInsertSchema(crowdData).pick({
  restaurantId: true,
  restaurantName: true,
  crowdLevel: true,
  crowdPercentage: true,
  peakHours: true,
  lastUpdated: true,
  expiresAt: true,
  source: true,
  metadata: true,
});

// Types
export type InsertCrowdData = z.infer<typeof insertCrowdDataSchema>;
export type CrowdDataRecord = typeof crowdData.$inferSelect;

/**
 * Crowd Data Repository for managing crowd level data
 */
export class CrowdDataRepository {
  private db: ReturnType<typeof drizzle>;
  private ttl: number; // Time-to-live in milliseconds
  private maxHistoricalRecords: number;

  /**
   * Creates a new instance of the CrowdDataRepository
   */
  constructor() {
    // Initialize database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.db = drizzle(pool);
    
    // Set TTL from environment variable or use default (24 hours)
    this.ttl = parseInt(process.env.CROWD_DATA_TTL || '86400000', 10);
    
    // Set max historical records from environment variable or use default (100)
    this.maxHistoricalRecords = parseInt(process.env.CROWD_DATA_MAX_HISTORICAL_RECORDS || '100', 10);
    
    console.log('CrowdDataRepository initialized with config:', {
      ttl: `${this.ttl / (1000 * 60 * 60)} hours`,
      maxHistoricalRecords: this.maxHistoricalRecords
    });
  }

  /**
   * Store crowd level data for a restaurant
   * @param data The crowd level data to store
   * @returns The stored crowd data record
   */
  async storeCrowdData(data: CrowdLevelData): Promise<CrowdDataRecord> {
    try {
      // Calculate expiration time based on TTL
      const expiresAt = new Date(Date.now() + this.ttl);
      
      // Prepare data for insertion
      const insertData: InsertCrowdData = {
        restaurantId: data.restaurantName.toLowerCase().replace(/\s+/g, '-'),
        restaurantName: data.restaurantName,
        crowdLevel: data.crowdLevel,
        crowdPercentage: data.crowdPercentage || null,
        peakHours: data.peakHours || null,
        lastUpdated: data.lastUpdated,
        expiresAt: expiresAt,
        source: data.source,
        metadata: {} // Additional metadata can be added here
      };
      
      // Insert data into the database
      const result = await this.db.insert(crowdData).values(insertData).returning();
      
      console.log(`Stored crowd data for ${data.restaurantName}, expires at ${expiresAt.toISOString()}`);
      
      return result[0];
    } catch (error) {
      console.error('Failed to store crowd data:', error);
      throw new Error(`Failed to store crowd data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the latest crowd data for a restaurant
   * @param restaurantId The ID of the restaurant
   * @returns The latest crowd data record or null if not found
   */
  async getLatestCrowdData(restaurantId: string): Promise<CrowdDataRecord | null> {
    try {
      const result = await this.db.select()
        .from(crowdData)
        .where(eq(crowdData.restaurantId, restaurantId))
        .orderBy(desc(crowdData.lastUpdated))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Failed to get latest crowd data for restaurant ${restaurantId}:`, error);
      throw new Error(`Failed to get latest crowd data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get crowd data for a restaurant by name
   * @param restaurantName The name of the restaurant
   * @returns The latest crowd data record or null if not found
   */
  async getCrowdDataByName(restaurantName: string): Promise<CrowdDataRecord | null> {
    try {
      const result = await this.db.select()
        .from(crowdData)
        .where(eq(crowdData.restaurantName, restaurantName))
        .orderBy(desc(crowdData.lastUpdated))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Failed to get crowd data for restaurant ${restaurantName}:`, error);
      throw new Error(`Failed to get crowd data by name: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get historical crowd data for a restaurant
   * @param restaurantId The ID of the restaurant
   * @param limit Maximum number of records to return
   * @returns Array of historical crowd data records
   */
  async getHistoricalCrowdData(restaurantId: string, limit: number = 10): Promise<CrowdDataRecord[]> {
    try {
      // Ensure limit doesn't exceed maximum
      const actualLimit = Math.min(limit, this.maxHistoricalRecords);
      
      const result = await this.db.select()
        .from(crowdData)
        .where(eq(crowdData.restaurantId, restaurantId))
        .orderBy(desc(crowdData.lastUpdated))
        .limit(actualLimit);
      
      return result;
    } catch (error) {
      console.error(`Failed to get historical crowd data for restaurant ${restaurantId}:`, error);
      throw new Error(`Failed to get historical crowd data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get crowd data for multiple restaurants
   * @param restaurantIds Array of restaurant IDs
   * @returns Map of restaurant IDs to their latest crowd data
   */
  async getBatchCrowdData(restaurantIds: string[]): Promise<Map<string, CrowdDataRecord>> {
    try {
      const result = new Map<string, CrowdDataRecord>();
      
      // Get latest crowd data for each restaurant
      const data = await this.db.select()
        .from(crowdData)
        .where(inArray(crowdData.restaurantId, restaurantIds));
      
      // Group by restaurant ID and get the latest for each
      const groupedData = data.reduce((acc, record) => {
        if (!acc.has(record.restaurantId) ||
            new Date(acc.get(record.restaurantId)!.lastUpdated) < new Date(record.lastUpdated)) {
          acc.set(record.restaurantId, record);
        }
        return acc;
      }, new Map<string, CrowdDataRecord>());
      
      return groupedData;
    } catch (error) {
      console.error('Failed to get batch crowd data:', error);
      throw new Error(`Failed to get batch crowd data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update existing crowd data record
   * @param id The ID of the record to update
   * @param data The updated crowd data
   * @returns The updated crowd data record
   */
  async updateCrowdData(id: number, data: Partial<CrowdLevelData>): Promise<CrowdDataRecord | null> {
    try {
      // Calculate new expiration time based on TTL
      const expiresAt = new Date(Date.now() + this.ttl);
      
      // Prepare update data
      const updateData: Partial<InsertCrowdData> = {
        ...data,
        expiresAt: expiresAt
      };
      
      // Update record in the database
      const result = await this.db.update(crowdData)
        .set(updateData)
        .where(eq(crowdData.id, id))
        .returning();
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Failed to update crowd data with ID ${id}:`, error);
      throw new Error(`Failed to update crowd data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete expired crowd data records
   * @returns Number of deleted records
   */
  async deleteExpiredData(): Promise<number> {
    try {
      const now = new Date();
      
      // Delete expired records
      const result = await this.db.delete(crowdData)
        .where(lt(crowdData.expiresAt, now))
        .returning();
      
      console.log(`Deleted ${result.length} expired crowd data records`);
      
      return result.length;
    } catch (error) {
      console.error('Failed to delete expired crowd data:', error);
      throw new Error(`Failed to delete expired data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get crowd data for restaurants in a specific area
   * @param location Location string (e.g., "New York, NY")
   * @param limit Maximum number of records to return
   * @returns Array of crowd data records for restaurants in the specified area
   */
  async getCrowdDataByLocation(location: string, limit: number = 20): Promise<CrowdDataRecord[]> {
    try {
      // This is a simplified implementation
      // In a real-world scenario, you would use geospatial queries
      // For now, we'll just search for restaurants with the location in their name
      const result = await this.db.select()
        .from(crowdData)
        .where(like(crowdData.restaurantName, `%${location}%`))
        .orderBy(desc(crowdData.lastUpdated))
        .limit(limit);
      
      return result;
    } catch (error) {
      console.error(`Failed to get crowd data for location ${location}:`, error);
      throw new Error(`Failed to get crowd data by location: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get crowd data statistics
   * @returns Statistics about the crowd data
   */
  async getStatistics(): Promise<{
    totalRecords: number;
    busyCount: number;
    moderateCount: number;
    notBusyCount: number;
    unknownCount: number;
    averagePercentage: number | null;
  }> {
    try {
      // Get total count
      const totalResult = await this.db.select({ count: sql<number>`count(*)` }).from(crowdData);
      const totalRecords = Number(totalResult[0].count);
      
      // Get counts by crowd level
      const busyResult = await this.db.select({ count: sql<number>`count(*)` })
        .from(crowdData)
        .where(eq(crowdData.crowdLevel, 'busy'));
      const busyCount = Number(busyResult[0].count);
      
      const moderateResult = await this.db.select({ count: sql<number>`count(*)` })
        .from(crowdData)
        .where(eq(crowdData.crowdLevel, 'moderate'));
      const moderateCount = Number(moderateResult[0].count);
      
      const notBusyResult = await this.db.select({ count: sql<number>`count(*)` })
        .from(crowdData)
        .where(eq(crowdData.crowdLevel, 'not_busy'));
      const notBusyCount = Number(notBusyResult[0].count);
      
      const unknownResult = await this.db.select({ count: sql<number>`count(*)` })
        .from(crowdData)
        .where(eq(crowdData.crowdLevel, 'unknown'));
      const unknownCount = Number(unknownResult[0].count);
      
      // Calculate average percentage
      const avgResult = await this.db.select({
        avg: sql<number | null>`avg(crowd_percentage)`
      }).from(crowdData);
      const averagePercentage = avgResult[0].avg;
      
      return {
        totalRecords,
        busyCount,
        moderateCount,
        notBusyCount,
        unknownCount,
        averagePercentage
      };
    } catch (error) {
      console.error('Failed to get crowd data statistics:', error);
      throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Migrate crowd data schema
   * This method would be used when the schema changes
   * @returns Success status
   */
  async migrateSchema(): Promise<boolean> {
    // This is a placeholder for schema migration logic
    // In a real implementation, this would handle schema changes
    console.log('Schema migration not implemented yet');
    return true;
  }
}

// Export a default instance with default configuration
export const defaultCrowdDataRepository = new CrowdDataRepository();