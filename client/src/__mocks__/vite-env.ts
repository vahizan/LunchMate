// Mock Vite environment variables for tests
Object.defineProperty(window, 'import', {
  value: {
    meta: {
      env: {
        VITE_PLACES_PROVIDER: 'hybrid',
        VITE_GOOGLE_MAPS_API_KEY: 'test-google-key',
        VITE_FOURSQUARE_PLACES_API_KEY: 'test-foursquare-key',
        DEV: true
      }
    }
  },
  writable: true
});