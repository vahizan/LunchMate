import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Restaurant } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { areFiltersEqual, areLocationsEqual } from '@/lib/utils';

// Define interface for restaurant ID object
interface RestaurantId {
  fsq_id: string;
}

// Define pagination response type
interface RestaurantsResponse {
  results: Restaurant[];
  size: number,
  cursor?: string,
}

interface RestaurantIdsResponse {
  results: RestaurantId[],
  size: number,
  cursor?: string
}

export function useRestaurants(props?: { limit?: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { location, filters, visitHistory } = useAppContext();
  const [highlightedRestaurant, setHighlightedRestaurant] = useState<Restaurant | null>(null);
  const [isFetchData, setIsFetchData] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [restaurantIds, setRestaurantIds] = useState<RestaurantId[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string>();
  const [loadMore, setLoadMore] = useState<boolean>(false);
  const [currentLimit] = useState<string>(props?.limit || '50');
  const [isRandomPickLoading, setIsRandomPickLoading] = useState<boolean>(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  // Track previous location and filters to determine if we need to refetch
  const [prevLocationFilters, setPrevLocationFilters] = useState<{
    location: typeof location;
    filters: typeof filters;
  } | null>(null);
  
  // Check if filters or location have changed
  const hasFiltersOrLocationChanged = useMemo(() => {
    if (!prevLocationFilters) return true;
    
    const locationChanged = !areLocationsEqual(location, prevLocationFilters.location);
    const filtersChanged = !areFiltersEqual(filters, prevLocationFilters.filters);
    
    return locationChanged || filtersChanged;
  }, [location, filters, prevLocationFilters]);

  // Create a stable query key that will change when location or filters change
  const queryKey = useMemo(() => {
    return JSON.stringify({
      endpoint: '/api/restaurants',
      timestamp: Date.now(), // Ensure the query key changes when filters change
      location: location ? { lat: location.lat, lng: location.lng } : null,
      filters: filters ? {
        radius: filters.radius,
        cuisines: filters.cuisines,
        dietary: filters.dietary,
        priceLevel: filters.priceLevel,
        historyDays: filters.historyDays,
        excludeChains: filters.excludeChains,
        excludeCafe: filters.excludeCafe
      } : null
    });
  }, [location, filters]);
  
  // Reset state when location or filters change
  useEffect(() => {
    if (hasFiltersOrLocationChanged) {
      setAllRestaurants([]);
      setCurrentCursor(undefined);
      setRestaurantIds([]);
    }
  }, [hasFiltersOrLocationChanged]);
  
  // Build URL parameters based on location and filters
  const buildUrlParams = useCallback((
    baseLocation = location,
    baseFilters = filters,
    cursor?: string,
    additionalParams: Record<string, string> = {}
  ): URLSearchParams => {
    if (!baseLocation || baseLocation.lat === undefined || baseLocation.lng === undefined) {
      throw new Error('Location not set');
    }
    
    // Ensure lat and lng are numbers before converting to string
    const lat = Number(baseLocation.lat);
    const lng = Number(baseLocation.lng);
    
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: baseFilters.radius.toString(),
      pageSize: currentLimit,
      ...additionalParams
    });
    
    // Add cuisine filters if any
    if (baseFilters.cuisines.length > 0) {
      baseFilters.cuisines.forEach(cuisine => {
        params.append('cuisines', cuisine);
      });
    }
    
    // Add dietary filters if any
    if (baseFilters.dietary.length > 0) {
      baseFilters.dietary.forEach(diet => {
        params.append('dietary', diet);
      });
    }
    
    // Add price level filter if set
    if (baseFilters.priceLevel) {
      params.append('priceLevel', baseFilters.priceLevel.toString());
    }
    
    // Add exclude chains filter if set
    if (baseFilters.excludeChains) {
      params.append('excludeChains', baseFilters.excludeChains.toString());
    }
    
    // Add exclude cafe filter if set
    if (baseFilters.excludeCafe) {
      params.append('excludeCafe', baseFilters.excludeCafe.toString());
    }
    
    // Add cursor if provided
    if (cursor) {
      params.append('cursor', cursor);
    }
    
    return params;
  }, [location, filters, currentLimit]);

  // Query to get restaurants based on location and filters
  const query = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      try {
        // Set fetch data state to true at the beginning of the fetch
        setIsFetchData(true);
        
        // Check if location coordinates are valid (including 0 as valid)
        if (location?.lat === undefined || location?.lng === undefined) {
          return { results: [], size: 0 };
        }
        
        const params = buildUrlParams(location, filters, currentCursor);
        
        // Make the request
        console.log(`useRestaurants - fetching page with params:`, params.toString());
        const response = await fetch(`/api/restaurants?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch restaurants');
        }
        
        const data: RestaurantsResponse = await response.json();
        console.log(`useRestaurants - received page with ${data.results.length} results`, data);
        
        setCurrentCursor(data.cursor);
        setHasMore(Boolean(data.cursor));
        setAllRestaurants(prev => [...prev, ...data.results]);
        
        return data;
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        throw error;
      } finally {
        setIsFetchData(false);
        setLoadMore(false);
      }
    },
    enabled: isFetchData || hasFiltersOrLocationChanged || loadMore,
  });

  
  // Update prevLocationFilters when query is successful
  useEffect(() => {
    if (query.isSuccess && !query.isFetching) {
      setPrevLocationFilters({ location, filters });
    }
  }, [query.isSuccess, query.isFetching, location, filters]);
  
  // Filter out restaurants that have been visited recently
  const filteredRestaurants = useMemo(() => {
    if (!allRestaurants.length) return [];
    
    return allRestaurants.filter(restaurant => {
      if (filters.historyDays === 0) return true;
      
      // Find if restaurant was visited within the specified days
      const recentVisit = visitHistory.find(visit => {
        const visitDate = new Date(visit.visitDate);
        const daysSinceVisit = Math.floor((Date.now() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
        return visit.id === restaurant.place_id && daysSinceVisit < filters.historyDays;
      });
      
      return !recentVisit;
    });
  }, [allRestaurants, filters.historyDays, visitHistory]);

  // Function to fetch restaurant IDs with pagination
  const fetchRestaurantIds = useCallback(async (): Promise<RestaurantId[]> => {
    try {
      const params = buildUrlParams(location, filters, undefined, { fieldsToFetch: 'fsq_id' });
      console.log("Fetching restaurant IDs with params:", params.toString());
      
      let allIds: RestaurantId[] = [];
      let count = 0;
      let cursor: string | undefined;
      
      // Fetch all pages of restaurant IDs
      while (cursor !== null || count === 0) {
        if (cursor) {
          params.set('cursor', cursor);
        }
        
        const response = await fetch(`/api/restaurants/ids?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant IDs');
        }
        
        const data: RestaurantIdsResponse = await response.json();
        allIds = allIds.concat(data.results);
        cursor = data.cursor;
        count++;
        
        if (!cursor) break;
      }
      
      console.log(`Fetched a total of ${allIds.length} restaurant IDs`);
      return allIds;
    } catch (error) {
      console.error("Error fetching restaurant IDs:", error);
      throw error;
    }
  }, [location, filters, buildUrlParams]);

  // Pick random restaurant
  const pickRandomRestaurant = useCallback(async () => {
    try {
      console.log("Picking random restaurant");
      setIsRandomPickLoading(true);
      
      // If there's a previously selected restaurant, add it to skipped IDs
      if (lastSelectedId) {
        setSkippedIds(prev => {
          const newSkipped = new Set(prev);
          newSkipped.add(lastSelectedId);
          return newSkipped;
        });
        // Reset last selected ID
        setLastSelectedId(null);
      }
      
      if (!location || location.lat === undefined || location.lng === undefined) {
        toast({
          title: "Location not set",
          description: "Please set your location first.",
          variant: "destructive"
        });
        return;
      }
      
      // Check if we need to fetch new restaurant IDs due to location or filter changes
      let currentIds = restaurantIds;
      if (hasFiltersOrLocationChanged || currentIds.length === 0) {
        console.log("Filters or location changed, fetching new restaurant IDs");
        currentIds = await fetchRestaurantIds();
        setRestaurantIds(currentIds);
      }
      
      if (currentIds.length === 0) {
        throw new Error('No restaurants found matching your criteria');
      }
      
      // Filter out skipped IDs from the available options
      const availableIds = currentIds.filter(id => !skippedIds.has(id.fsq_id));
      
      let randomId: string;
      
      // Check if we have any IDs left after filtering
      if (availableIds.length === 0) {
        // If all restaurants have been skipped, reset skipped IDs and use all available IDs
        setSkippedIds(new Set());
        toast({
          title: "All options viewed",
          description: "You've seen all available options. Starting over with all restaurants.",
        });
        
        if (currentIds.length === 0) {
          throw new Error('No restaurants found matching your criteria');
        }
        
        const randomIndex = Math.floor(Math.random() * currentIds.length);
        randomId = currentIds[randomIndex].fsq_id;
      } else {
        // We have IDs that haven't been skipped yet
        console.log(`Selecting random restaurant from ${availableIds.length} options (${skippedIds.size} skipped)`);
        
        const randomIndex = Math.floor(Math.random() * availableIds.length);
        randomId = availableIds[randomIndex].fsq_id;
      }
      
      // Save the selected ID so we can skip it next time
      setLastSelectedId(randomId);
      
      // Build query parameters for restaurant details
      const restaurantByIdParams = buildUrlParams(
        location,
        filters,
        undefined,
        {}
      );
      
      // Fetch full details for the selected restaurant
      console.log(`Fetching details for restaurant ID: ${randomId}`);
      const detailsResponse = await fetch(`/api/restaurants/${randomId}?${restaurantByIdParams}`);
      
      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch restaurant details');
      }
      
      const restaurant = await detailsResponse.json();
      setHighlightedRestaurant(restaurant);
      
      // Update previous location and filters
      setPrevLocationFilters({ location, filters });
      
      // Log the skipped IDs for debugging
      console.log(`Skipped IDs: ${Array.from(skippedIds).join(', ')}`);
      
    } catch (error) {
      console.error("Error picking random restaurant:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to pick a random restaurant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRandomPickLoading(false);
    }
  }, [
    location,
    filters,
    lastSelectedId,
    restaurantIds,
    skippedIds,
    hasFiltersOrLocationChanged,
    fetchRestaurantIds,
    buildUrlParams,
    toast
  ]);

  // Add restaurant to team suggestion
  const addToTeamMutation = useMutation({
    mutationFn: async (restaurant: Restaurant) => {
      const response = await fetch('/api/team/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restaurant),
      });
      if (!response.ok) throw new Error('Failed to add restaurant to team suggestions');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
      toast({
        title: "Added to team",
        description: "The restaurant has been added to team suggestions",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add",
        description: "Could not add restaurant to team suggestions",
        variant: "destructive"
      });
    }
  });

  // Force refetch when navigating to results page
  const triggerFetch = useCallback(() => {
    setPrevLocationFilters({ location, filters });
    setIsFetchData(true);
  }, [location, filters]);

  // Load more data handler
  const loadMoreData = useCallback(() => {
    setLoadMore(true);
  }, []);

  return {
    data: filteredRestaurants,
    isLoading: query.isLoading || query.isFetching,
    isRandomPickLoading,
    error: query.error,
    refetch: triggerFetch,
    pickRandomRestaurant,
    addToTeam: addToTeamMutation.mutate,
    highlightedRestaurant,
    hasMore,
    loadMoreData,
  };
}
