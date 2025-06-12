import { Request, Response } from 'express';
import fetch from 'node-fetch';
import config from '../../lib/config';
import { z } from 'zod';

/**
 * Google Maps API Proxy Controller
 * Handles proxying requests to Google Maps API endpoints
 */
export class GoogleMapsProxyController {
  private apiKey: string = '';
  private baseUrl: string = 'https://maps.googleapis.com/maps/api';
  private initialized: boolean = false;

  /**
   * Initialize the controller by fetching the API key
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const googleMapsConfig = await config.getGoogleMapsConfig();
      this.apiKey = googleMapsConfig.apiKey;
      this.initialized = true;
      console.log('Google Maps Proxy Controller initialized');
    } catch (error) {
      console.error('Failed to initialize Google Maps Proxy Controller:', error);
      throw error;
    }
  }

  /**
   * Ensure the controller is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Geocode an address to coordinates
   * @param req Express request
   * @param res Express response
   */
  public geocode = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        address: z.string().min(1, 'Address is required'),
      });

      const validationResult = schema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: validationResult.error.format(),
        });
        return;
      }

      const { address } = validationResult.data;
      
      // Build the URL for geocoding API
      const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
      
      // Make the request to Google Maps API
      const response = await fetch(url);
      const data = await response.json();
      
      // Return the response
      res.json(data);
    } catch (error) {
      console.error('Error in geocode endpoint:', error);
      res.status(500).json({ error: 'Failed to geocode address' });
    }
  };

  /**
   * Reverse geocode coordinates to an address
   * @param req Express request
   * @param res Express response
   */
  public reverseGeocode = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        lat: z.string().or(z.number()).transform(val => parseFloat(val.toString())),
        lng: z.string().or(z.number()).transform(val => parseFloat(val.toString())),
      });

      const validationResult = schema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: validationResult.error.format(),
        });
        return;
      }

      const { lat, lng } = validationResult.data;
      
      // Build the URL for reverse geocoding API
      const url = `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      
      // Make the request to Google Maps API
      const response = await fetch(url);
      const data = await response.json();
      
      // Return the response
      res.json(data);
    } catch (error) {
      console.error('Error in reverse geocode endpoint:', error);
      res.status(500).json({ error: 'Failed to reverse geocode coordinates' });
    }
  };

  /**
   * Search for places
   * @param req Express request
   * @param res Express response
   */
  public places = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        location: z.string().optional(),
        radius: z.string().or(z.number()).transform(val => parseFloat(val.toString())).optional(),
        keyword: z.string().optional(),
        type: z.string().optional(),
        minprice: z.string().or(z.number()).transform(val => parseFloat(val.toString())).optional(),
        maxprice: z.string().or(z.number()).transform(val => parseFloat(val.toString())).optional(),
      });

      const validationResult = schema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: validationResult.error.format(),
        });
        return;
      }

      const params = validationResult.data;
      
      // Build the URL for places API
      let url = `${this.baseUrl}/place/nearbysearch/json?key=${this.apiKey}`;
      
      // Add parameters to URL
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url += `&${key}=${encodeURIComponent(value.toString())}`;
        }
      });
      
      // Make the request to Google Maps API
      const response = await fetch(url);
      const data = await response.json();
      
      // Return the response
      res.json(data);
    } catch (error) {
      console.error('Error in places endpoint:', error);
      res.status(500).json({ error: 'Failed to search for places' });
    }
  };

  /**
   * Get place details
   * @param req Express request
   * @param res Express response
   */
  public placeDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        place_id: z.string().min(1, 'Place ID is required'),
        fields: z.string().optional(),
      });

      const validationResult = schema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: validationResult.error.format(),
        });
        return;
      }

      const { place_id, fields } = validationResult.data;
      
      // Build the URL for place details API
      let url = `${this.baseUrl}/place/details/json?place_id=${place_id}&key=${this.apiKey}`;
      
      // Add fields parameter if provided
      if (fields) {
        url += `&fields=${fields}`;
      }
      
      // Make the request to Google Maps API
      const response = await fetch(url);
      const data = await response.json();
      
      // Return the response
      res.json(data);
    } catch (error) {
      console.error('Error in place details endpoint:', error);
      res.status(500).json({ error: 'Failed to get place details' });
    }
  };

  /**
   * Calculate distance matrix
   * @param req Express request
   * @param res Express response
   */
  public distanceMatrix = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        origins: z.string().min(1, 'Origins are required'),
        destinations: z.string().min(1, 'Destinations are required'),
        mode: z.string().optional(),
        departure_time: z.string().or(z.number()).optional(),
        traffic_model: z.string().optional(),
      });

      const validationResult = schema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: validationResult.error.format(),
        });
        return;
      }

      const params = validationResult.data;
      
      // Build the URL for distance matrix API
      let url = `${this.baseUrl}/distancematrix/json?key=${this.apiKey}`;
      
      // Add parameters to URL
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url += `&${key}=${encodeURIComponent(value.toString())}`;
        }
      });
      
      // Make the request to Google Maps API
      const response = await fetch(url);
      const data = await response.json();
      
      // Return the response
      res.json(data);
    } catch (error) {
      console.error('Error in distance matrix endpoint:', error);
      res.status(500).json({ error: 'Failed to calculate distance matrix' });
    }
  };
}

// Export singleton instance
export const googleMapsProxyController = new GoogleMapsProxyController();