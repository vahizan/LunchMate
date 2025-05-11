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
  const [loadMore, setLoadMore] = useState<boolean>(false);
  const [currentLimit, setCurrentLimit] = useState<string>(props?.limit || '50');

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
      
      if (!location || location.lat === undefined || location.lng === undefined) {
        toast({
          title: "Location not set",
          description: "Please set your location first.",
          variant: "destructive"
        });
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
        fieldsToFetch: 'fsq_id' // Only fetch the ID field
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
      
      console.log("filtersUpdated", isFiltersUpdated);
      if(!restaurantIds || isFiltersUpdated) {
        // Make the request to get all restaurant IDs
        console.log("Fetching all restaurant IDs with params:", params.toString());
        const response = await fetch(`/api/restaurants/ids?${params.toString()}`);
        const data = await response.json();
        const allIds: RestaurantId[] = data.results;
        setRestaurantIds(allIds);
        
        if (!response.ok) {
          throw new Error('Failed to fetch restaurant IDs');
        }
      }
     
     
      console.log("restaurantIds", restaurantIds);
      if(!restaurantIds) {
        throw new Error('Failed to fetch restaurants');
      }

      const randomIndex = Math.floor(Math.random() * restaurantIds.length);
      const randomId = restaurantIds[randomIndex].fsq_id;
      
      // Fetch full details for the selected restaurant
      console.log(`Fetching details for restaurant ID: ${randomId}`);
      const detailsResponse = await fetch(`/api/restaurants/${randomId}`);
      
      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch restaurant details');
      }
      
      const restaurant = await detailsResponse.json();
      setHighlightedRestaurant(restaurant);
      
      // Update previous location and filters
      setPrevLocationFilters({ location, filters });
      
    } catch (error) {
      console.error("Error picking random restaurant:", error);
      toast({
        title: "Error",
        description: "Failed to pick a random restaurant. Please try again.",
        variant: "destructive"
      });
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
    error: query.error,
    refetch: triggerFetch,
    pickRandomRestaurant,
    addToTeam: addToTeamMutation.mutate,
    highlightedRestaurant: highlightedRestaurant,
    hasMore,
    loadMoreData: () => setLoadMore(true),
  };
}
