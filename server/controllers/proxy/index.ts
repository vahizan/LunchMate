import { Express } from 'express';
import { googleMapsProxyController } from './google-maps-controller';
import { foursquareProxyController } from './foursquare-controller';

/**
 * Register all proxy routes
 * @param app Express application
 */
export async function registerProxyRoutes(app: Express): Promise<void> {
  console.log('Registering proxy routes...');

  // Initialize controllers
  await googleMapsProxyController.initialize();
  await foursquareProxyController.initialize();

  // Register Google Maps API routes
  app.get('/api/proxy/google/geocode', googleMapsProxyController.geocode);
  app.get('/api/proxy/google/reverse-geocode', googleMapsProxyController.reverseGeocode);
  app.get('/api/proxy/google/places', googleMapsProxyController.places);
  app.get('/api/proxy/google/place-details', googleMapsProxyController.placeDetails);
  app.get('/api/proxy/google/distance-matrix', googleMapsProxyController.distanceMatrix);

  // Register Foursquare API routes
  app.get('/api/proxy/foursquare/places', foursquareProxyController.searchPlaces);
  app.get('/api/proxy/foursquare/place-details', foursquareProxyController.getPlaceDetails);
  app.get('/api/proxy/foursquare/place-photos', foursquareProxyController.getPlacePhotos);
  app.get('/api/proxy/foursquare/place-tips', foursquareProxyController.getPlaceTips);
  app.get('/api/proxy/foursquare/autocomplete', foursquareProxyController.autocomplete);
  app.get('/api/proxy/foursquare/geocode', foursquareProxyController.geocode);

  console.log('Proxy routes registered successfully');
}