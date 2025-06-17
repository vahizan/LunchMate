import { Request, Response } from 'express';
import fetch from 'node-fetch';
import config from '../../lib/config';
import { z } from 'zod';

/**
 * Foursquare API Proxy Controller
 * Handles proxying requests to Foursquare API endpoints
 */
export class FoursquareProxyController {
  private apiKey: string = '';
  private baseUrl: string = 'https://api.foursquare.com/v3';
  private initialized: boolean = false;

  /**
   * Initialize the controller by fetching the API key
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const foursquareConfig = await config.getFoursquareConfig();
      this.apiKey = foursquareConfig.apiKey;
      this.initialized = true;
      console.log('Foursquare Proxy Controller initialized');
    } catch (error) {
      console.error('Failed to initialize Foursquare Proxy Controller:', error);
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
   * Make a request to the Foursquare API
   * @param url The URL to request
   * @returns The response data
   */
  private async makeRequest(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'Authorization': this.apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Foursquare API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    return {
      data,
      headers: response.headers
    };
  }

  /**
   * Search for places
   * @param req Express request
   * @param res Express response
   */
  public searchPlaces = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        ll: z.string().optional(),
        query: z.string().optional(),
        radius: z.string().or(z.number()).transform(val => parseFloat(val.toString())).optional(),
        categories: z.string().optional(),
        fields: z.string().optional(),
        sort: z.string().optional(),
        limit: z.string().or(z.number()).transform(val => parseFloat(val.toString())).optional(),
        cursor: z.string().optional(),
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
      
      // Build the URL for places search API
      let url = `${this.baseUrl}/places/search`;
      
      // Add parameters to URL
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
      
      // Make the request to Foursquare API
      const response = await this.makeRequest(url);
      
      // Extract cursor from Link header if present
      let cursor = null;
      const linkHeader = response.headers.get('link');
      if (linkHeader) {
        const match = linkHeader.match(/cursor=([^&>]+)/);
        if (match && match[1]) {
          cursor = match[1];
        }
      }
      
      // Return the response with cursor
      res.json({
        results: response.data,
        cursor
      });
    } catch (error) {
      console.error('Error in search places endpoint:', error);
      res.status(500).json({ error: 'Failed to search for places' });
    }
  };

  /**
   * Get place details
   * @param req Express request
   * @param res Express response
   */
  public getPlaceDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        fsq_id: z.string().min(1, 'Foursquare ID is required'),
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

      const { fsq_id, fields } = validationResult.data;
      
      // Build the URL for place details API
      let url = `${this.baseUrl}/places/${fsq_id}`;
      
      // Add fields parameter if provided
      if (fields) {
        url += `?fields=${fields}`;
      }
      
      // Make the request to Foursquare API
      const response = await this.makeRequest(url);
      
      // Return the response
      res.json(response.data);
    } catch (error) {
      console.error('Error in get place details endpoint:', error);
      res.status(500).json({ error: 'Failed to get place details' });
    }
  };

  /**
   * Get place photos
   * @param req Express request
   * @param res Express response
   */
  public getPlacePhotos = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        fsq_id: z.string().min(1, 'Foursquare ID is required'),
        limit: z.string().or(z.number()).transform(val => parseFloat(val.toString())).optional(),
      });

      const validationResult = schema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: validationResult.error.format(),
        });
        return;
      }

      const { fsq_id, limit } = validationResult.data;
      
      // Build the URL for place photos API
      let url = `${this.baseUrl}/places/${fsq_id}/photos`;
      
      // Add limit parameter if provided
      if (limit) {
        url += `?limit=${limit}`;
      }
      
      // Make the request to Foursquare API
      const response = await this.makeRequest(url);
      
      // Return the response
      res.json(response.data);
    } catch (error) {
      console.error('Error in get place photos endpoint:', error);
      res.status(500).json({ error: 'Failed to get place photos' });
    }
  };

  /**
   * Get place tips
   * @param req Express request
   * @param res Express response
   */
  public getPlaceTips = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        fsq_id: z.string().min(1, 'Foursquare ID is required'),
        limit: z.string().or(z.number()).transform(val => parseFloat(val.toString())).optional(),
      });

      const validationResult = schema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: validationResult.error.format(),
        });
        return;
      }

      const { fsq_id, limit } = validationResult.data;
      
      // Build the URL for place tips API
      let url = `${this.baseUrl}/places/${fsq_id}/tips`;
      
      // Add limit parameter if provided
      if (limit) {
        url += `?limit=${limit}`;
      }
      
      // Make the request to Foursquare API
      const response = await this.makeRequest(url);
      
      // Return the response
      res.json(response.data);
    } catch (error) {
      console.error('Error in get place tips endpoint:', error);
      res.status(500).json({ error: 'Failed to get place tips' });
    }
  };

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
      // Foursquare doesn't have a direct geocoding API, so we'll use the places search API
      // with the near parameter set to the address
      let url = `${this.baseUrl}/places/search`;
      
      // Add parameters to URL
      const queryParams = new URLSearchParams();
      queryParams.append('query', address);
      queryParams.append('limit', '1');
      
      url += `?${queryParams.toString()}`;
      
      // Make the request to Foursquare API
      const response = await this.makeRequest(url);
      
      // Transform the response to match the format expected by the client
      // The client expects a results array with geo objects
      const results = (response.data.results || []).map((result: any) => {
        return {
          type: 'geo',
          text: {
            primary: result.text?.primary || result.name || ''
          },
          geo: {
            name: result.text?.primary || result.name || '',
            center: {
              latitude: result.geocodes?.main?.latitude || 0,
              longitude: result.geocodes?.main?.longitude || 0
            },
            locality: result.text?.secondary || '',
            region: '',
            country: ''
          }
        };
      });
      
      // Return the transformed response
      res.json({ results });
    } catch (error) {
      console.error('Error in geocode endpoint:', error);
      res.status(500).json({ error: 'Failed to geocode address' });
    }
  };

  /**
   * Autocomplete locations
   * @param req Express request
   * @param res Express response
   */
  public autocomplete = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.ensureInitialized();

      // Validate request parameters
      const schema = z.object({
        query: z.string().min(1, 'Query is required'),
        types: z.string().optional(),
        limit: z.string().or(z.number()).transform(val => parseFloat(val.toString())).optional(),
      });

      const validationResult = schema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid request parameters',
          details: validationResult.error.format(),
        });
        return;
      }

      const { query, types, limit } = validationResult.data;
      
      // Build the URL for autocomplete API
      let url = `${this.baseUrl}/autocomplete`;
      
      // Add parameters to URL
      const queryParams = new URLSearchParams();
      queryParams.append('query', query);
      
      if (types) {
        queryParams.append('types', types);
      }
      
      if (limit) {
        queryParams.append('limit', limit.toString());
      }
      
      url += `?${queryParams.toString()}`;
      
      // Make the request to Foursquare API
      const response = await this.makeRequest(url);
      
      // Return the response
      res.json(response.data);
    } catch (error) {
      console.error('Error in autocomplete endpoint:', error);
      res.status(500).json({ error: 'Failed to autocomplete locations' });
    }
  };
}

// Export singleton instance
export const foursquareProxyController = new FoursquareProxyController();