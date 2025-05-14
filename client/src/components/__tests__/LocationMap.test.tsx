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

  const mockAppContextValue = {
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
    location: undefined,
    setLocation: jest.fn(),
    filters: {
      radius: [0.5],
      cuisines: [],
      dietary: [],
      priceLevel: 2,
      historyDays: 14,
      excludeChains: false,
      excludeCafe: false,
    },
    setFilters: jest.fn(),
    resetFilters: jest.fn(),
    restaurants: [],
    setRestaurants: jest.fn(),
    isLoading: false,
    setIsLoading: jest.fn(),
    teamModalOpen: false,
    setTeamModalOpen: jest.fn(),
  };

  test('should render the map container', () => {
    render(
      <AppContext.Provider value={mockAppContextValue}>
        <LocationMap />
      </AppContext.Provider>
    );

    const mapContainer = screen.getByText('Choose on map');
    expect(mapContainer).toBeInTheDocument();
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

  test('should use defaultLocation from userPreferences if no location prop', async () => {
    render(
      <AppContext.Provider value={mockAppContextValue}>
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

  test('should handle location from localStorage', async () => {
    // Set up localStorage with a location
    const localStorageLocation: Location = {
      address: 'Stored Address',
      lat: 35.6762,
      lng: 139.6503,
    };
    localStorageMock.setItem('location', JSON.stringify(localStorageLocation));

    // Create a context with location loaded from localStorage
    const contextWithStoredLocation = {
      ...mockAppContextValue,
      location: localStorageLocation,
    };

    render(
      <AppContext.Provider value={contextWithStoredLocation}>
        <LocationMap />
      </AppContext.Provider>
    );

    // The component should still use defaultLocation since we're not passing the location from context
    await waitFor(() => {
      expect(mockShowMap).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
        lat: defaultLocation.lat,
        lng: defaultLocation.lng,
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

  test('should call onMapClick when button is clicked', () => {
    const onMapClick = jest.fn();
    render(
      <AppContext.Provider value={mockAppContextValue}>
        <LocationMap onMapClick={onMapClick} />
      </AppContext.Provider>
    );

    const button = screen.getByText('Choose on map');
    button.click();
    
    expect(onMapClick).toHaveBeenCalledTimes(1);
  });

  test('should use different provider types correctly', async () => {
    // Mock the usePlaces hook to return 'google' provider
    (usePlacesModule.usePlaces as jest.Mock).mockReturnValue({
      showMap: mockShowMap,
      providerType: 'google',
    });

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

    // Now mock it to return 'hybrid' provider
    jest.clearAllMocks();
    (usePlacesModule.usePlaces as jest.Mock).mockReturnValue({
      showMap: mockShowMap,
      providerType: 'hybrid',
    });

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
});