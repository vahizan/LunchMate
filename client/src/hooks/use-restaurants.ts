import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Restaurant } from '@/types';
import { useToast } from '@/hooks/use-toast';

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

export function useRestaurants(props?: {limit?: string}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { location, filters, visitHistory } = useAppContext();
  const [isFiltersUpdated, setIsFiltersUpdated] = useState<boolean>();
  const [highlightedRestaurant, setHighlightedRestaurant] = useState<Restaurant| null>(null);
  const [isFetchData, setIsFetchData] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>();
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [restaurantIds, setRestaurantIds] = useState<RestaurantId[]>();
  const [currentCursor, setCurrentCursor] = useState<string>();
  const [currentAllIdsCursor, setCurrentAllIdsCursor] = useState<string>();
  const [loadMore, setLoadMore] = useState<boolean>(false);
  const [currentLimit, setCurrentLimit] = useState<string>(props?.limit || '50');
  const [isRandomPickLoading, setIsRandomPickLoading] = useState<boolean>(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  // Track previous location and filters to determine if we need to refetch
  const [prevLocationFilters, setPrevLocationFilters] = useState<{
    location: typeof location;
    filters: typeof filters;
  } | null>(null);
  
  // Create a stable query key that will change when location or filters change
  // Add a timestamp to ensure the query key changes when filters change
  const timestamp = Date.now();
  
  // Create a stringified query key to ensure it changes when location or filters change
  const queryKeyString = JSON.stringify({
    endpoint: '/api/restaurants',
    timestamp: timestamp,
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
  
  console.log("useRestaurants - queryKeyString:", queryKeyString);
  
  // Query to get restaurants based on location and filters
  const query = useQuery({
    queryKey: [queryKeyString],
    queryFn: async () => {
      // Set fetch data state to true at the beginning of the fetch
      setIsFetchData(true);
      
      // Only log in development
      if (process.env.DEV) {
        console.log("useRestaurants - queryFn called with location:", location);
        console.log("useRestaurants - location lat type:", location?.lat !== undefined ? typeof location.lat : "undefined");
        console.log("useRestaurants - location lng type:", location?.lng !== undefined ? typeof location.lng : "undefined");
        console.log("useRestaurants - queryFn called with filters:", filters);
      }
      
      // Check if location coordinates are valid (including 0 as valid)
      // This properly handles the case where lat or lng is 0
      if (location?.lat === undefined || location?.lng === undefined) {
        setIsFetchData(false);
        if (process.env.DEV) {
          console.log("useRestaurants - invalid location, returning empty array");
          console.log("useRestaurants - location?.lat:", location?.lat);
          console.log("useRestaurants - location?.lng:", location?.lng);
        }
        return { results: [], size: 0 };
      }
      
      // Build query parameters to match what the server expects
      if (process.env.DEV) {
        console.log("useRestaurants - building params with lat:", location.lat, "type:", typeof location.lat);
        console.log("useRestaurants - building params with lng:", location.lng, "type:", typeof location.lng);
      }
      
      // Ensure lat and lng are numbers before converting to string
      const lat = Number(location.lat);
      const lng = Number(location.lng);
      
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: filters.radius.toString(),
        pageSize: currentLimit || '50'
      });
      
      // Add cuisine filters if any
      if (filters.cuisines.length > 0) {
        filters.cuisines.forEach(cuisine => {
          params.append('cuisines', cuisine);
        });
      }
      
      // Add dietary filters if any
      if (filters.dietary.length > 0) {
        filters.dietary.forEach(diet => {
          params.append('dietary', diet);
        });
      }
      
      // Add price level filter if set
      if (filters.priceLevel) {
        params.append('priceLevel', filters.priceLevel.toString());
      }
      
      // Add exclude chains filter if set
      if (filters.excludeChains) {
        params.append('excludeChains', filters.excludeChains.toString());
      }
      // Add exclude cafe filter if set
      if (filters.excludeCafe) {
        params.append('excludeCafe', filters.excludeCafe.toString());
      }
      
      if(currentCursor){
        console.log("currentCursor", currentCursor);
        params.append('cursor', currentCursor)
      }

      // Make the request
      console.log(`useRestaurants - fetching page with params:`, params.toString());
      const response = await fetch(`/api/restaurants?${params.toString()}`);
      
    
      if (!response.ok) {
        setIsFetchData(false);
        throw new Error('Failed to fetch restaurants');
      }
      
      
      const data: RestaurantsResponse = await response.json();
      console.log(`useRestaurants - received page ${data} with ${data.results.length} results`, data);

      setCurrentCursor(data.cursor);
      
      setHasMore(Boolean(data.cursor));
      setAllRestaurants((prev) =>  [...prev, ...data.results]);
      
      setIsFetchData(false);
      setLoadMore(false);
      return data;
    },
    enabled: isFetchData || isFiltersUpdated || loadMore,
  });

  
  // Update prevLocationFilters when query is successful
  useEffect(() => {
    if (query.isSuccess && !query.isFetching && allRestaurants.length > 0) {
      console.log("Query successful, updating prevLocationFilters");
      setPrevLocationFilters({ location, filters });
      setIsFiltersUpdated(true);
    } else {
      setIsFiltersUpdated(false);
    }
  }, [query.isSuccess, query.isFetching, allRestaurants.length, location, filters]);
  
  // Use all restaurants from state instead of directly from query
  const restaurants = allRestaurants;
  

  // Filter out restaurants that have been visited recently
  const filteredRestaurants = restaurants ? restaurants.filter(restaurant => {
    if (filters.historyDays === 0) return true;
    
    // Find if restaurant was visited within the specified days
    const recentVisit = visitHistory.find(visit => {
      const visitDate = new Date(visit.visitDate);
      const daysSinceVisit = Math.floor((Date.now() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
      return visit.id === restaurant.place_id && daysSinceVisit < filters.historyDays;
    });
    
    return !recentVisit;
  }) : [];

  // Pick random restaurant
  const pickRandomRestaurant = async () => {
    try {
      console.log("Fetching all restaurant IDs for random selection");
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
        setIsRandomPickLoading(false);
        return;
      }
      
      // Ensure lat and lng are numbers before converting to string
      const lat = Number(location.lat);
      const lng = Number(location.lng);
      
      // Build query parameters to get all restaurants with only fsq_id
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: filters.radius.toString(),
        fieldsToFetch: 'fsq_id', // Only fetch the ID field
        pageSize: currentLimit || '50'
      });
      
      // Add cuisine filters if any
      if (filters.cuisines.length > 0) {
        filters.cuisines.forEach(cuisine => {
          params.append('cuisines', cuisine);
        });
      }
      
      // Add dietary filters if any
      if (filters.dietary.length > 0) {
        filters.dietary.forEach(diet => {
          params.append('dietary', diet);
        });
      }
      
      // Add price level filter if set
      if (filters.priceLevel) {
        params.append('priceLevel', filters.priceLevel.toString());
      }
      
      // Add exclude chains filter if set
      if (filters.excludeChains) {
        params.append('excludeChains', filters.excludeChains.toString());
      }
      
      // Add exclude cafe filter if set
      if (filters.excludeCafe) {
        params.append('excludeCafe', filters.excludeCafe.toString());
      }

      // Reset restaurant IDs if filters have been updated
      if (isFiltersUpdated) {
        setRestaurantIds([]);
        setCurrentAllIdsCursor(undefined);
      }

      // Function to fetch restaurant IDs with pagination
      const fetchRestaurantIds = async (cursor?: string): Promise<RestaurantId[]> => {
        // Add cursor to params if it exists
        if (cursor) {
          params.set('cursor', cursor);
        } else {
          params.delete('cursor');
        }

        console.log("Fetching restaurant IDs with params:", params.toString());
        const response = await fetch(`/api/restaurants/ids?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant IDs');
        }
        
        const data: RestaurantIdsResponse = await response.json();
        
        // Update cursor for next page
        setCurrentAllIdsCursor(data.cursor);
        
        // Return the current page of results
        return data.results;
      };

      let allIds: RestaurantId[] = [];
      // If we don't have restaurant IDs yet or filters have been updated, fetch them
      if (!restaurantIds || restaurantIds.length === 0 || isFiltersUpdated) {
        let currentCursor: string | undefined = currentAllIdsCursor;
        
        // First fetch or reset due to filter change
        if (!currentCursor) {
          const initialIds = await fetchRestaurantIds();
          allIds = [...initialIds];
          currentCursor = currentAllIdsCursor;
        } else {
          // We already have some IDs, just use what we have
          allIds = restaurantIds || [];
        }
        
        // Keep fetching until cursor is null (no more pages)
        while (currentCursor) {
          const nextIds = await fetchRestaurantIds(currentCursor);
          allIds = [...allIds, ...nextIds];
          currentCursor = currentAllIdsCursor;
        }
        
        // Update state with all fetched IDs
        setRestaurantIds(allIds);
        console.log(`Fetched a total of ${allIds.length} restaurant IDs`);
      }
      
      // Ensure we have restaurant IDs to pick from
      if (!restaurantIds && !allIds) {
        throw new Error('No restaurants found matching your criteria');
      }

      // Filter out skipped IDs from the available options
      const availableIds = (restaurantIds || allIds || []).filter(
        id => !skippedIds.has(id.fsq_id)
      );
      
      let randomId: string;
      
      // Check if we have any IDs left after filtering
      if (availableIds.length === 0) {
        // If all restaurants have been skipped, reset skipped IDs and use all available IDs
        setSkippedIds(new Set());
        toast({
          title: "All options viewed",
          description: "You've seen all available options. Starting over with all restaurants.",
        });
        // Use the full list again
        const fullList = restaurantIds || allIds || [];
        if (fullList.length === 0) {
          throw new Error('No restaurants found matching your criteria');
        }
        
        const randomIndex = Math.floor(Math.random() * fullList.length);
        randomId = fullList[randomIndex].fsq_id;
      } else {
        // We have IDs that haven't been skipped yet
        console.log(`Selecting random restaurant from ${availableIds.length} options (${skippedIds.size} skipped)`);
        
        const randomIndex = Math.floor(Math.random() * availableIds.length);
        randomId = availableIds[randomIndex].fsq_id;
      }
      
      // Save the selected ID so we can skip it next time
      setLastSelectedId(randomId);
    
      
      // Build query parameters to get all restaurants with only fsq_id
      const restaurantByIdParams = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
      });
      
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
        description: "Failed to pick a random restaurant. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRandomPickLoading(false);
    }
  };

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
  const triggerFetch = () => {
    // Update previous location and filters when explicitly triggering a fetch
    setPrevLocationFilters({ location, filters });
    setIsFetchData(true);
  };

  return {
    data: filteredRestaurants,
    isLoading: query.isLoading || query.isFetching,
    isRandomPickLoading,
    error: query.error,
    refetch: triggerFetch,
    pickRandomRestaurant,
    addToTeam: addToTeamMutation.mutate,
    highlightedRestaurant: highlightedRestaurant,
    hasMore,
    loadMoreData: () => setLoadMore(true),
  };
}
