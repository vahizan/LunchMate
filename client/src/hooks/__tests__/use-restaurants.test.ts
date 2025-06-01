import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRestaurants } from '../use-restaurants';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/use-toast';
import { useRestaurantContext } from '../../context/RestaurantContext';
import { Restaurant, Location, Filters, VisitHistoryItem } from '../../types';
import React from 'react';

// Mock dependencies
jest.mock('../../context/AppContext');
jest.mock('../../hooks/use-toast');
jest.mock('../../context/RestaurantContext');

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
    excludeCafe: false,
    departureTime: '2025-05-16T10:30:00.000Z'
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
      price_level: 2,
      crowd_level: 'moderate',
      peak_hours: [
        { day: 'Monday', hour: 12, level: 'busy' },
        { day: 'Monday', hour: 13, level: 'busy' },
        { day: 'Friday', hour: 19, level: 'busy' },
        { day: 'Saturday', hour: 20, level: 'busy' }
      ]
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
      price_level: 3,
      crowd_level: 'busy'
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
      price_level: 2,
      crowd_level: 'not_busy'
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
    
    // Mock RestaurantContext
    const mockSetRestaurantResults = jest.fn();
    const mockSetLastFetchTimestamp = jest.fn();
    const mockClearResults = jest.fn();
    
    (useRestaurantContext as unknown as jest.Mock).mockReturnValue({
      selectedRestaurant: null,
      setSelectedRestaurant: jest.fn(),
      restaurantResults: [],
      setRestaurantResults: mockSetRestaurantResults,
      lastFetchTimestamp: null,
      setLastFetchTimestamp: mockSetLastFetchTimestamp,
      clearResults: mockClearResults
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
      } else if (url.includes('/api/restaurants/test-1/crowd-level')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              restaurantName: 'Test Restaurant 1',
              crowdLevel: 'moderate',
              averageTimeSpent: 'People typically spend 1-2 hours here',
              peakHours: [
                { day: 'Monday', hour: 12, level: 'busy' },
                { day: 'Friday', hour: 19, level: 'busy' }
              ],
              lastUpdated: new Date().toISOString(),
              source: 'google'
            }
          })
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
    expect(result.current.error).toBe(null);
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
        price_level: 1,
        crowd_level: 'moderate',
        peak_hours: [
          { day: 'Sunday', hour: 12, level: 'busy' },
          { day: 'Sunday', hour: 13, level: 'busy' }
        ]
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
      } else if (url.includes('/api/restaurants/test-1/crowd-level')) {
        // Crowd level data request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              restaurantName: 'Test Restaurant 1',
              crowdLevel: 'moderate',
              averageTimeSpent: 'People typically spend 1-2 hours here',
              peakHours: [
                { day: 'Monday', hour: 12, level: 'busy' },
                { day: 'Friday', hour: 19, level: 'busy' }
              ],
              lastUpdated: new Date().toISOString(),
              source: 'google'
            }
          })
        });
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
    
    // Should have set the highlighted restaurant with crowd data
    expect(result.current.highlightedRestaurant).toMatchObject(mockRestaurants[0]);
    // Verify crowd data properties exist
    expect(result.current.highlightedRestaurant?.crowd_level).toBe('moderate');
    expect(result.current.highlightedRestaurant?.peak_hours).toEqual(mockRestaurants[0].peak_hours);
    
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
  
  test('should refetch restaurant IDs when filters or location change', async () => {
    // Mock Math.random to always return 0 (first item in array)
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0);
    
    // Setup initial restaurant IDs
    const initialIds = [
      { fsq_id: 'test-1' },
      { fsq_id: 'test-2' }
    ];
    
    // Setup new restaurant IDs after filter change
    const newIds = [
      { fsq_id: 'test-3' },
      { fsq_id: 'test-4' }
    ];
    
    // Mock fetch to return different responses based on parameters
    const fetchMock = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/restaurants/ids')) {
        // Check if this is the second call with updated filters
        if (url.includes('cuisines=chinese')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: newIds,
              cursor: null,
              size: newIds.length
            })
          });
        } else {
          // First call with initial filters
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: initialIds,
              cursor: null,
              size: initialIds.length
            })
          });
        }
      } else if (url.includes('/api/restaurants/test-1/crowd-level')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              restaurantName: 'Test Restaurant 1',
              crowdLevel: 'moderate',
              averageTimeSpent: 'People typically spend 1-2 hours here',
              peakHours: [
                { day: 'Monday', hour: 12, level: 'busy' },
                { day: 'Friday', hour: 19, level: 'busy' }
              ],
              lastUpdated: new Date().toISOString(),
              source: 'google'
            }
          })
        });
      } else if (url.includes('/api/restaurants/test-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRestaurants[0])
        });
      } else if (url.includes('/api/restaurants/test-3')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            place_id: 'test-3',
            name: 'New Restaurant After Filter Change'
          })
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
    
    // Replace the global fetch with our mock
    (global.fetch as unknown as jest.Mock) = fetchMock;
    
    // Setup mock context with initial filters
    const initialFilters = { ...mockFilters, cuisines: ['italian'] };
    (useAppContext as unknown as jest.Mock).mockReturnValue({
      location: mockLocation,
      filters: initialFilters,
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
    const { result, rerender } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // First random pick with initial filters
    await act(async () => {
      await result.current.pickRandomRestaurant();
    });
    
    // Should have selected the first restaurant
    expect(result.current.highlightedRestaurant).toEqual(mockRestaurants[0]);
    
    // Now update the filters
    const updatedFilters = { ...mockFilters, cuisines: ['chinese'] };
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
    
    // Rerender with updated context
    rerender();
    
    // Second random pick with updated filters
    await act(async () => {
      await result.current.pickRandomRestaurant();
    });
    
    // Should have fetched new restaurant IDs and selected from the new list
    const fetchCalls = fetchMock.mock.calls;
    const idsCalls = fetchCalls.filter(call => call[0].includes('/api/restaurants/ids'));
    
    // Should have made at least 2 calls to fetch restaurant IDs
    expect(idsCalls.length).toBeGreaterThanOrEqual(2);
    
    // Verify that the second call included the updated cuisine filter
    expect(idsCalls[idsCalls.length - 1][0]).toContain('cuisines=chinese');
    
    // Should have updated the highlighted restaurant
    expect(result.current.highlightedRestaurant).toMatchObject({
      place_id: 'test-3',
      name: 'New Restaurant After Filter Change'
    });
    
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
      radius: [2],
      departureTime: '2025-05-16T11:00:00.000Z'
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

  test('should fetch and merge crowd level data when picking a random restaurant', async () => {
    // Mock restaurant data
    const mockRestaurant = {
      place_id: 'test-crowd',
      name: 'Test Crowd Restaurant',
      geometry: {
        location: {
          lat: 51.5074,
          lng: -0.1278
        }
      },
      rating: 4.5,
      price_level: 2
    };
    
    // Mock crowd level data
    const mockCrowdData = {
      success: true,
      data: {
        restaurantName: 'Test Crowd Restaurant',
        crowdLevel: 'busy',
        averageTimeSpent: 'People typically spend 1-2 hours here',
        peakHours: [
          { day: 'Monday', hour: 12, level: 'busy' },
          { day: 'Friday', hour: 19, level: 'busy' }
        ],
        lastUpdated: new Date().toISOString(),
        source: 'google'
      }
    };
    
    // Mock fetch to return restaurant and crowd data
    const fetchMock = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/restaurants/ids')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: [{ fsq_id: 'test-crowd' }],
            cursor: null,
            size: 1
          })
        });
      } else if (url.includes('/api/restaurants/test-crowd/crowd-level')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCrowdData)
        });
      } else if (url.includes('/api/restaurants/test-crowd')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRestaurant)
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
    
    // Replace the global fetch with our mock
    (global.fetch as unknown as jest.Mock) = fetchMock;
    
    // Control Math.random to return predictable values
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0);
    
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Pick a random restaurant
    await act(async () => {
      await result.current.pickRandomRestaurant();
    });
    
    // Verify that both restaurant details and crowd level data were fetched
    const crowdLevelCalls = fetchMock.mock.calls.filter(call =>
      call[0].includes('/api/restaurants/test-crowd/crowd-level')
    );
    expect(crowdLevelCalls.length).toBe(1);
    
    // Verify that crowd data was merged with restaurant data
    expect(result.current.highlightedRestaurant).toEqual({
      ...mockRestaurant,
      crowd_level: 'busy',
      average_time_spent: 'People typically spend 1-2 hours here',
      peak_hours: mockCrowdData.data.peakHours
    });
    
    // Restore original Math.random
    Math.random = originalRandom;
  });

  test.skip('should skip previously selected restaurants when picking random restaurants', async () => {
    // Create a set of restaurant IDs to test with
    const testRestaurantIds = [
      { fsq_id: 'test-1' },
      { fsq_id: 'test-2' },
      { fsq_id: 'test-3' }
    ];
    
    // Mock Math.random to return predictable values in sequence
    const originalRandom = Math.random;
    let randomCallCount = 0;
    Math.random = jest.fn().mockImplementation(() => {
      // Return 0, 0, 0 for the first three calls to always select the first item
      // This will help us verify the skipping behavior
      return 0;
    });
    
    // Mock fetch to return our test restaurant IDs and details
    const fetchMock = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/restaurants/ids')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: testRestaurantIds,
            cursor: null,
            size: testRestaurantIds.length
          })
        });
      } else if (url.includes('/api/restaurants/test-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            place_id: 'test-1',
            name: 'Test Restaurant 1',
            geometry: { location: { lat: 51.5074, lng: -0.1278 } }
          })
        });
      } else if (url.includes('/api/restaurants/test-2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            place_id: 'test-2',
            name: 'Test Restaurant 2',
            geometry: { location: { lat: 51.5075, lng: -0.1279 } }
          })
        });
      } else if (url.includes('/api/restaurants/test-3')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            place_id: 'test-3',
            name: 'Test Restaurant 3',
            geometry: { location: { lat: 51.5076, lng: -0.1280 } }
          })
        });
      } else if (url.includes('/api/restaurants/') && url.includes('/crowd-level')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              crowdLevel: 'moderate',
              averageTimeSpent: 'People typically spend 1-2 hours here',
              peakHours: []
            }
          })
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
    
    // Replace the global fetch with our mock
    (global.fetch as unknown as jest.Mock) = fetchMock;
    
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(() => useRestaurants(), { wrapper });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // First call to pickRandomRestaurant should select test-1
 
    await result.current.pickRandomRestaurant()
 

    await waitFor(() => {
        expect(result.current.highlightedRestaurant?.place_id).toBe('test-1');
    });
    
    rerender({highlightedRestaurant: result.current.highlightedRestaurant});
    await result.current.pickRandomRestaurant()


     await waitFor(() => {
        expect(result.current.highlightedRestaurant?.place_id).toBe('test-2');
    });
    
    // Third call should skip test-1 and test-2, and select test-3
     rerender({highlightedRestaurant: result.current.highlightedRestaurant});
     await result.current.pickRandomRestaurant()
   

    
     await waitFor(() => {
        expect(result.current.highlightedRestaurant?.place_id).toBe('test-3');
    });
    
    // Fourth call should reset skipped IDs and start over with test-1
    // We should also see a toast notification about starting over
    const toastMock = (useToast as unknown as jest.Mock).mock.results[0].value.toast;
    
    rerender({highlightedRestaurant: result.current.highlightedRestaurant});

    await result.current.pickRandomRestaurant()


    
    // Verify we got the "all options viewed" toast
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "All options viewed",
        description: expect.stringContaining("You've seen all available options")
      })
    );
    
    // Verify we're back to the first restaurant
    expect(result.current.highlightedRestaurant?.place_id).toBe('test-1');
    
    // Restore original Math.random
    Math.random = originalRandom;
  });
});