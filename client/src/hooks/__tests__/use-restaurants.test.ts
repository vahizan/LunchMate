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
    size: 3,
    cursor: 'next-page-cursor'
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
    
    // Mock fetch for standard tests
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
    expect(result.current.hasMore).toBe(true); // Should have more results based on cursor
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

  test('should handle loadMoreData functionality', async () => {
    // Mock fetch to return different results for cursor-based pagination
    const page2Restaurants = [
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
    ];
    
    const page2Response = {
      results: page2Restaurants,
      size: 1,
      cursor: null // No more pages
    };
    
    // Setup a fetch mock that tracks calls and returns appropriate responses
    const fetchMock = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/restaurants?')) {
        if (url.includes('cursor=next-page-cursor')) {
          // Second request with cursor parameter
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(page2Response)
          });
        } else {
          // First request without cursor
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPaginatedResponse)
          });
        }
      }
      
      // Other API calls
      if (url.includes('/api/restaurants/ids')) {
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
    
    // Replace the global fetch with our mock
    (global.fetch as unknown as jest.Mock) = fetchMock;
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Initial data should have 2 restaurants (after filtering)
    expect(result.current.data.length).toBe(2);
    expect(result.current.hasMore).toBe(true);
    
    // Load more results
    act(() => {
      result.current.loadMoreData();
    });
    
    // Should be loading more
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should now have 3 restaurants (2 from first load + 1 from loadMore)
    expect(result.current.data.length).toBe(3);
    expect(result.current.hasMore).toBe(false); // No more results since cursor is null
    
    // Verify that the second fetch call included the cursor parameter
    const fetchCalls = fetchMock.mock.calls;
    expect(fetchCalls.length).toBeGreaterThan(1);
    expect(fetchCalls[1][0]).toContain('cursor=next-page-cursor');
  });

  test('should handle pickRandomRestaurant with pagination and loading state', async () => {
    // Mock Math.random to always return 0 (first item in array)
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0);
    
    // Setup a fetch mock that returns paginated results for restaurant IDs
    const page1Ids = [
      { fsq_id: 'test-1' },
      { fsq_id: 'test-2' }
    ];
    
    const page2Ids = [
      { fsq_id: 'test-3' },
      { fsq_id: 'test-4' }
    ];
    
    const page3Ids = [
      { fsq_id: 'test-5' }
    ];
    
    // Mock fetch to return different responses for each page
    const fetchMock = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/restaurants/ids')) {
        if (url.includes('cursor=page2')) {
          // Second page
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: page2Ids,
              cursor: 'page3',
              size: page2Ids.length
            })
          });
        } else if (url.includes('cursor=page3')) {
          // Third page (last page)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: page3Ids,
              cursor: null, // No more pages
              size: page3Ids.length
            })
          });
        } else {
          // First page
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: page1Ids,
              cursor: 'page2',
              size: page1Ids.length
            })
          });
        }
      } else if (url.includes('/api/restaurants/test-1')) {
        // Restaurant details request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRestaurants[0])
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
    
    // Replace the global fetch with our mock
    (global.fetch as unknown as jest.Mock) = fetchMock;
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Initially, isRandomPickLoading should be false
    expect(result.current.isRandomPickLoading).toBe(false);
    
    // Start picking a random restaurant
    let pickPromise: Promise<void>;
    act(() => {
      pickPromise = result.current.pickRandomRestaurant();
    });
    
    // Loading state should be true while fetching
    expect(result.current.isRandomPickLoading).toBe(true);
    
    // Wait for the operation to complete
    await act(async () => {
      await pickPromise;
    });
    
    // Loading state should be false after completion
    expect(result.current.isRandomPickLoading).toBe(false);
    
    // Should have set the highlighted restaurant
    expect(result.current.highlightedRestaurant).toEqual(mockRestaurants[0]);
    
    // Verify that fetch was called for each page
    const fetchCalls = fetchMock.mock.calls;
    const idsCalls = fetchCalls.filter(call => call[0].includes('/api/restaurants/ids'));
    
    // Should have made 3 calls to fetch restaurant IDs (one for each page)
    expect(idsCalls.length).toBe(3);
    
    // Verify the cursor was used correctly in each call
    expect(idsCalls[0][0]).not.toContain('cursor=');
    expect(idsCalls[1][0]).toContain('cursor=page2');
    expect(idsCalls[2][0]).toContain('cursor=page3');
    
    // Restore original Math.random
    Math.random = originalRandom;
  });
  
  test('should skip previously selected restaurants when picking random restaurants', async () => {
    // Setup mock data
    const restaurantIds = [
      { fsq_id: 'test-1' },
      { fsq_id: 'test-2' },
      { fsq_id: 'test-3' }
    ];
    
    // Control Math.random to return predictable values
    const originalRandom = Math.random;
    const mockRandom = jest.fn()
      .mockReturnValueOnce(0) // First call: select index 0 (test-1)
      .mockReturnValueOnce(0); // Second call: select index 0 of filtered array (test-2)
    
    Math.random = mockRandom;
    
    // Mock fetch to return restaurant IDs and details
    const fetchMock = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/restaurants/ids')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: restaurantIds,
            cursor: null,
            size: restaurantIds.length
          })
        });
      } else if (url.includes('/api/restaurants/test-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            place_id: 'test-1',
            name: 'Restaurant 1'
          })
        });
      } else if (url.includes('/api/restaurants/test-2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            place_id: 'test-2',
            name: 'Restaurant 2'
          })
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
    
    // Replace the global fetch with our mock
    (global.fetch as unknown as jest.Mock) = fetchMock;
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // First random pick
    await act(async () => {
      await result.current.pickRandomRestaurant();
    });
    
    // Should have selected the first restaurant
    expect(result.current.highlightedRestaurant).toEqual({
      place_id: 'test-1',
      name: 'Restaurant 1'
    });
    
    // Second random pick
    await act(async () => {
      await result.current.pickRandomRestaurant();
    });
    
    // Should have skipped the first restaurant and selected the second one
    expect(result.current.highlightedRestaurant).toEqual({
      place_id: 'test-2',
      name: 'Restaurant 2'
    });
    
    // Verify fetch was called correctly
    const fetchCalls = fetchMock.mock.calls;
    const detailsCalls = fetchCalls.filter(call => call[0].includes('/api/restaurants/test-'));
    
    // Should have made calls to fetch details for test-1 and test-2
    expect(detailsCalls.length).toBe(2);
    expect(detailsCalls[0][0]).toContain('/api/restaurants/test-1');
    expect(detailsCalls[1][0]).toContain('/api/restaurants/test-2');
    
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

  test('should treat location with lat/lng of 0 as valid', async () => {
    // Override the mock to set location with lat/lng of 0
    (useAppContext as unknown as jest.Mock).mockReturnValue({
      location: { address: 'Zero Coordinates', lat: 0, lng: 0 },
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
    
    // Clear previous fetch calls
    (global.fetch as unknown as jest.Mock).mockClear();
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Should have called fetch with lat=0 and lng=0
    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as unknown as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('lat=0');
    expect(fetchCall).toContain('lng=0');
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
  
  test('should accumulate restaurants when loading more data', async () => {
    // Create mock responses for initial load and subsequent loads
    const initialRestaurants = [
      {
        place_id: 'initial-1',
        name: 'Initial Restaurant 1',
        geometry: { location: { lat: 51.5074, lng: -0.1278 } },
        rating: 4.5,
        price_level: 2
      },
      {
        place_id: 'initial-2',
        name: 'Initial Restaurant 2',
        geometry: { location: { lat: 51.5075, lng: -0.1279 } },
        rating: 4.2,
        price_level: 3
      }
    ];
    
    const moreRestaurants = [
      {
        place_id: 'more-1',
        name: 'More Restaurant 1',
        geometry: { location: { lat: 51.5076, lng: -0.1280 } },
        rating: 4.0,
        price_level: 1
      }
    ];
    
    const initialResponse = {
      results: initialRestaurants,
      size: 2,
      cursor: 'next-cursor'
    };
    
    const moreResponse = {
      results: moreRestaurants,
      size: 1,
      cursor: null
    };
    
    // Setup fetch mock to return different responses
    let fetchCount = 0;
    const fetchMock = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/restaurants?')) {
        if (fetchCount === 0) {
          fetchCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(initialResponse)
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(moreResponse)
          });
        }
      }
      return Promise.reject(new Error('Not found'));
    });
    
    // Replace global fetch with our mock
    (global.fetch as unknown as jest.Mock) = fetchMock;
    
    // Override visit history to avoid filtering
    (useAppContext as unknown as jest.Mock).mockReturnValue({
      location: mockLocation,
      filters: { ...mockFilters, historyDays: 0 }, // No history filtering
      visitHistory: [],
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
    
    // Wait for initial load to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Verify initial data
    expect(result.current.data.length).toBe(2);
    expect(result.current.data[0].place_id).toBe('initial-1');
    expect(result.current.data[1].place_id).toBe('initial-2');
    expect(result.current.hasMore).toBe(true);
    
    // Load more data
    act(() => {
      result.current.loadMoreData();
    });
    
    // Wait for load more to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Verify accumulated data (should have both initial and more restaurants)
    expect(result.current.data.length).toBe(3);
    expect(result.current.data[0].place_id).toBe('initial-1');
    expect(result.current.data[1].place_id).toBe('initial-2');
    expect(result.current.data[2].place_id).toBe('more-1');
    expect(result.current.hasMore).toBe(false);
  });
  
  test('should update when filters change', async () => {
    // Setup a fetch mock that tracks calls
    const fetchMock = jest.fn().mockImplementation((url) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPaginatedResponse)
      });
    });
    
    // Replace global fetch with our mock
    (global.fetch as unknown as jest.Mock) = fetchMock;
    
    // Initial render with default filters
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(() => useRestaurants(), { wrapper });
    
    // Wait for initial load to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Clear fetch calls
    fetchMock.mockClear();
    
    // Update the filters
    const updatedFilters = {
      ...mockFilters,
      cuisines: ['thai', 'japanese'],
      radius: [2]
    };
    
    // Mock AppContext with updated filters
    (useAppContext as unknown as jest.Mock).mockReturnValue({
      location: mockLocation,
      filters: updatedFilters,
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
    
    // Rerender with updated filters
    rerender();
    
    // Trigger a fetch with the updated filters
    act(() => {
      result.current.refetch();
    });
    
    // Wait for the fetch to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Verify that fetch was called with the updated filters
    expect(fetchMock).toHaveBeenCalled();
    const fetchCall = fetchMock.mock.calls[0][0];
    expect(fetchCall).toContain('cuisines=thai');
    expect(fetchCall).toContain('cuisines=japanese');
    expect(fetchCall).toContain('radius=2');
  });
});