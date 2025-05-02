import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRestaurants } from '../use-restaurants';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/use-toast';
import { Restaurant, Location, Filters, VisitHistoryItem } from '../../types';
import React from 'react';

// Mock dependencies
jest.mock('../../context/AppContext');
jest.mock('../../hooks/use-toast');

// Mock fetch API
global.fetch = jest.fn();

describe('useRestaurants', () => {
  // Mock data
  const mockLocation: Location = {
    address: 'Test Address',
    lat: 51.5074,
    lng: -0.1278
  };

  const mockFilters: Filters = {
    radius: [1],
    cuisines: ['italian'],
    dietary: ['vegetarian'],
    priceLevel: 2,
    historyDays: 14,
    excludeChains: true,
    excludeCafe: false
  };

  const mockVisitHistory = [
    { id: 'visited-1', name: 'Visited Restaurant 1', visitDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'visited-2', name: 'Visited Restaurant 2', visitDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  const mockRestaurants: Restaurant[] = [
    {
      place_id: 'test-1',
      name: 'Test Restaurant 1',
      geometry: {
        location: {
          lat: 51.5074,
          lng: -0.1278
        }
      },
      rating: 4.5,
      price_level: 2
    },
    {
      place_id: 'test-2',
      name: 'Test Restaurant 2',
      geometry: {
        location: {
          lat: 51.5075,
          lng: -0.1279
        }
      },
      rating: 4.2,
      price_level: 3
    },
    {
      place_id: 'visited-1',
      name: 'Visited Restaurant 1',
      geometry: {
        location: {
          lat: 51.5076,
          lng: -0.1280
        }
      },
      rating: 4.0,
      price_level: 2
    }
  ];

  const mockPaginatedResponse = {
    results: mockRestaurants,
    pagination: {
      page: 1,
      pageSize: 10,
      totalCount: 3,
      totalPages: 1,
      hasMore: false
    }
  };

  const mockRestaurantIds = [
    { fsq_id: 'test-1' },
    { fsq_id: 'test-2' },
    { fsq_id: 'visited-1' }
  ];

  // Setup mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AppContext
    (useAppContext as unknown as jest.Mock).mockReturnValue({
      location: mockLocation,
      filters: mockFilters,
      visitHistory: mockVisitHistory,
      userPreferences: null,
      setUserPreferences: jest.fn(),
      favorites: [],
      toggleFavorite: jest.fn(),
      isFavorite: jest.fn(),
      addToHistory: jest.fn(),
      removeFromHistory: jest.fn(),
      clearVisitHistory: jest.fn(),
      setLocation: jest.fn(),
      setFilters: jest.fn(),
      resetFilters: jest.fn(),
      restaurants: [],
      setRestaurants: jest.fn(),
      isLoading: false,
      setIsLoading: jest.fn(),
      teamModalOpen: false,
      setTeamModalOpen: jest.fn()
    });
    
    // Mock useToast
    (useToast as unknown as jest.Mock).mockReturnValue({
      toast: jest.fn()
    });
    
    // Mock fetch
    (global.fetch as unknown as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/restaurants?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPaginatedResponse)
        });
      } else if (url.includes('/api/restaurants/ids')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: mockRestaurantIds })
        });
      } else if (url.includes('/api/restaurants/test-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRestaurants[0])
        });
      } else if (url.includes('/api/team/suggestions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
  });

  // Helper function to create a wrapper with QueryClientProvider
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    
    return ({ children }: { children: React.ReactNode }) => {
      return React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );
    };
  };

  test('should initialize with correct default values', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    // Initial state should have empty data and loading state
    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the query to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // After loading, should have filtered restaurants
    expect(result.current.data.length).toBe(2); // Excludes visited-1 due to history filter
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should filter out recently visited restaurants', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should filter out visited-1 (visited 5 days ago) but keep visited-2 (visited 20 days ago)
    const filteredIds = result.current.data.map(r => r.place_id);
    expect(filteredIds).not.toContain('visited-1');
    expect(filteredIds).toContain('test-1');
    expect(filteredIds).toContain('test-2');
  });

  test('should not filter restaurants when historyDays is 0', async () => {
    // Override the mock to set historyDays to 0
    (useAppContext as unknown as jest.Mock).mockReturnValue({
      location: mockLocation,
      filters: { ...mockFilters, historyDays: 0 },
      visitHistory: mockVisitHistory,
      userPreferences: null,
      setUserPreferences: jest.fn(),
      favorites: [],
      toggleFavorite: jest.fn(),
      isFavorite: jest.fn(),
      addToHistory: jest.fn(),
      removeFromHistory: jest.fn(),
      clearVisitHistory: jest.fn(),
      setLocation: jest.fn(),
      setFilters: jest.fn(),
      resetFilters: jest.fn(),
      restaurants: [],
      setRestaurants: jest.fn(),
      isLoading: false,
      setIsLoading: jest.fn(),
      teamModalOpen: false,
      setTeamModalOpen: jest.fn()
    });
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should not filter out any restaurants
    expect(result.current.data.length).toBe(3);
  });

  test('should handle loadMore functionality', async () => {
    // Mock fetch to return different results for page 2
    const page2Response = {
      results: [
        {
          place_id: 'test-3',
          name: 'Test Restaurant 3',
          geometry: {
            location: {
              lat: 51.5077,
              lng: -0.1281
            }
          },
          rating: 4.7,
          price_level: 1
        }
      ],
      pagination: {
        page: 2,
        pageSize: 10,
        totalCount: 4,
        totalPages: 2,
        hasMore: false
      }
    };
    
    // First call returns page 1 with hasMore=true, second call returns page 2
    (global.fetch as unknown as jest.Mock).mockImplementation((url) => {
      if (url.includes('page=1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...mockPaginatedResponse,
            pagination: { ...mockPaginatedResponse.pagination, hasMore: true }
          })
        });
      } else if (url.includes('page=2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(page2Response)
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPaginatedResponse)
      });
    });
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Initial data should have 2 restaurants (after filtering)
    expect(result.current.data.length).toBe(2);
    expect(result.current.hasMore).toBe(true);
    
    // Load more results
    act(() => {
      result.current.loadMore();
    });
    
    // Should be loading more
    expect(result.current.isFetchingMore).toBe(true);
    
    await waitFor(() => !result.current.isFetchingMore);
    
    // Should now have 3 restaurants (2 from page 1 + 1 from page 2)
    expect(result.current.data.length).toBe(3);
    expect(result.current.hasMore).toBe(false);
  });

  test('should handle pickRandomRestaurant', async () => {
    // Mock Math.random to always return 0 (first item in array)
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0);
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Pick a random restaurant
    await act(async () => {
      await result.current.pickRandomRestaurant();
    });
    
    // Should have set the highlighted restaurant
    expect(result.current.highlightedRestaurant).toEqual(mockRestaurants[0]);
    
    // Restore original Math.random
    Math.random = originalRandom;
  });

  test('should handle addToTeam mutation', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => !result.current.isLoading);
    
    // Add a restaurant to team
    await act(async () => {
      result.current.addToTeam(mockRestaurants[0]);
    });
    
    // Should have called fetch with the correct parameters
    expect(global.fetch).toHaveBeenCalledWith('/api/team/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockRestaurants[0])
    });
  });

  test('should handle fetch errors', async () => {
    // Mock fetch to return an error
    (global.fetch as unknown as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
    });
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.error).not.toBeNull());
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toEqual([]);
  });

  test('should not fetch data when location is undefined', async () => {
    // Override the mock to set location to undefined
    (useAppContext as unknown as jest.Mock).mockReturnValue({
      location: undefined,
      filters: mockFilters,
      visitHistory: mockVisitHistory,
      userPreferences: null,
      setUserPreferences: jest.fn(),
      favorites: [],
      toggleFavorite: jest.fn(),
      isFavorite: jest.fn(),
      addToHistory: jest.fn(),
      removeFromHistory: jest.fn(),
      clearVisitHistory: jest.fn(),
      setLocation: jest.fn(),
      setFilters: jest.fn(),
      resetFilters: jest.fn(),
      restaurants: [],
      setRestaurants: jest.fn(),
      isLoading: false,
      setIsLoading: jest.fn(),
      teamModalOpen: false,
      setTeamModalOpen: jest.fn()
    });
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should not have called fetch
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  test('should refetch data when triggerFetch is called', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Clear the mock to track new calls
    (global.fetch as unknown as jest.Mock).mockClear();
    
    // Trigger a refetch
    act(() => {
      result.current.refetch();
    });
    
    // Should be loading
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should have called fetch again
    expect(global.fetch).toHaveBeenCalled();
  });
});