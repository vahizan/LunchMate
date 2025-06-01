import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LocationMap } from '../LocationMap';
import { AppContext } from '@/context/AppContext';
import * as usePlacesModule from '@/hooks/use-places';
import { Location } from '@/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  
// Mock usePlaces hook
const mockShowMap = jest.fn();
jest.mock('@/hooks/use-places', () => ({
  usePlaces: jest.fn(() => ({
    showMap: mockShowMap,
    providerType: 'foursquare',
  })),
}));

describe('LocationMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  const defaultLocation: Location = {
    address: 'Default Address',
    lat: 51.5074,
    lng: -0.1278,
  };

  const propLocation: Location = {
    address: 'Prop Address',
    lat: 40.7128,
    lng: -74.0060,
  };

  const createMockAppContextValue = (contextLocation?: Location) => ({
    userPreferences: {
      defaultLocation,
    },
    setUserPreferences: jest.fn(),
    favorites: [],
    toggleFavorite: jest.fn(),
    isFavorite: jest.fn(),
    visitHistory: [],
    addToHistory: jest.fn(),
    removeFromHistory: jest.fn(),
    clearVisitHistory: jest.fn(),
    location: contextLocation,
    setLocation: jest.fn(),
    filters: {
      radius: [0.5],
      cuisines: [],
      dietary: [],
      priceLevel: 2,
      historyDays: 14,
      excludeChains: false,
      excludeCafe: false,
      departureTime: '12:00',
    },
    setFilters: jest.fn(),
    resetFilters: jest.fn(),
    restaurants: [],
    setRestaurants: jest.fn(),
    isLoading: false,
    setIsLoading: jest.fn(),
    teamModalOpen: false,
    setTeamModalOpen: jest.fn(),
  });
  
  const mockAppContextValue = createMockAppContextValue();

  test('should render the map container', () => {
    render(
      <AppContext.Provider value={mockAppContextValue}>
        <LocationMap />
      </AppContext.Provider>
    );

    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();
    expect(mapContainer).toHaveAttribute('id', 'map');
  });

  test('should use location from props if provided', async () => {
    render(
      <AppContext.Provider value={mockAppContextValue}>
        <LocationMap location={propLocation} />
      </AppContext.Provider>
    );

    await waitFor(() => {
      expect(mockShowMap).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
        lat: propLocation.lat,
        lng: propLocation.lng,
      });
    });
  });

  test('should use savedLocation from context if no location prop is provided', async () => {
    const contextWithLocation = createMockAppContextValue(defaultLocation);
    
    render(
      <AppContext.Provider value={contextWithLocation}>
        <LocationMap />
      </AppContext.Provider>
    );

    await waitFor(() => {
      expect(mockShowMap).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
        lat: defaultLocation.lat,
        lng: defaultLocation.lng,
      });
    });
  });

  test('should use location from context when no prop is provided', async () => {
    // Set up a location in context
    const contextLocation: Location = {
      address: 'Context Address',
      lat: 35.6762,
      lng: 139.6503,
    };
    
    const contextWithLocation = createMockAppContextValue(contextLocation);

    render(
      <AppContext.Provider value={contextWithLocation}>
        <LocationMap />
      </AppContext.Provider>
    );

    // The component should use the location from context
    await waitFor(() => {
      expect(mockShowMap).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
        lat: contextLocation.lat,
        lng: contextLocation.lng,
      });
    });
  });

  test('should handle location prop with zero coordinates', async () => {
    const zeroLocation: Location = {
      address: 'Zero Coordinates',
      lat: 0,
      lng: 0,
    };

    render(
      <AppContext.Provider value={mockAppContextValue}>
        <LocationMap location={zeroLocation} />
      </AppContext.Provider>
    );

    await waitFor(() => {
      expect(mockShowMap).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
        lat: 0,
        lng: 0,
      });
    });
  });


  test('should use different provider types correctly', async () => {
    // Test with 'google' provider
    jest.clearAllMocks();
    (usePlacesModule.usePlaces as jest.Mock).mockReturnValue({
      showMap: mockShowMap,
      providerType: 'google',
    });

    const contextWithLocation = createMockAppContextValue(defaultLocation);
    
    const { unmount } = render(
      <AppContext.Provider value={contextWithLocation}>
        <LocationMap location={propLocation} />
      </AppContext.Provider>
    );

    await waitFor(() => {
      expect(mockShowMap).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
        lat: propLocation.lat,
        lng: propLocation.lng,
      });
    });

    // Clean up the first render
    unmount();

    // Test with 'hybrid' provider
    jest.clearAllMocks();
    (usePlacesModule.usePlaces as jest.Mock).mockReturnValue({
      showMap: mockShowMap,
      providerType: 'hybrid',
    });

    render(
      <AppContext.Provider value={contextWithLocation}>
        <LocationMap location={propLocation} />
      </AppContext.Provider>
    );

    await waitFor(() => {
      expect(mockShowMap).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
        lat: propLocation.lat,
        lng: propLocation.lng,
      });
    });
  });
  
  test('should update map when savedLocation changes', async () => {
    // Initial render with no location in context
    const initialContext = createMockAppContextValue(undefined);
    
    const { rerender } = render(
      <AppContext.Provider value={initialContext}>
        <LocationMap />
      </AppContext.Provider>
    );
    
    // No map should be shown initially since there's no location
    expect(mockShowMap).not.toHaveBeenCalled();
    
    // Update context with a location
    const updatedLocation: Location = {
      address: 'Updated Address',
      lat: 48.8566,
      lng: 2.3522,
    };
    
    const updatedContext = createMockAppContextValue(updatedLocation);
    
    // Re-render with updated context
    rerender(
      <AppContext.Provider value={updatedContext}>
        <LocationMap />
      </AppContext.Provider>
    );
    
    // Map should now be shown with the updated location
    await waitFor(() => {
      expect(mockShowMap).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
        lat: updatedLocation.lat,
        lng: updatedLocation.lng,
      });
    });
  });
});