import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Restaurant } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Define pagination response type
interface PaginatedResponse {
  results: Restaurant[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function useRestaurants() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { location, filters, visitHistory } = useAppContext();
  const [highlightedRestaurant, setHighlightedRestaurant] = useState<Restaurant| null>(null);
  const [isFetchData, setIsFetchData] = useState<boolean>(true);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  
  // Create a stable query key that will change when location or filters change
  // Add a timestamp to ensure the query key changes when filters change
  const timestamp = Date.now();
  
  // Create a stringified query key to ensure it changes when location or filters change
  const queryKeyString = JSON.stringify({
    endpoint: '/api/restaurants',
    timestamp: timestamp,
    page: page,
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
      // Only log in development
      if (import.meta.env.DEV) {
        console.log("useRestaurants - queryFn called with location:", location);
        console.log("useRestaurants - location lat type:", location?.lat !== undefined ? typeof location.lat : "undefined");
        console.log("useRestaurants - location lng type:", location?.lng !== undefined ? typeof location.lng : "undefined");
        console.log("useRestaurants - queryFn called with filters:", filters);
      }
      
      // Check if location coordinates are valid (including 0 as valid)
      // This properly handles the case where lat or lng is 0
      if (location?.lat === undefined || location?.lng === undefined) {
        setIsFetchData(false);
        if (import.meta.env.DEV) {
          console.log("useRestaurants - invalid location, returning empty array");
          console.log("useRestaurants - location?.lat:", location?.lat);
          console.log("useRestaurants - location?.lng:", location?.lng);
        }
        return { results: [], pagination: { hasMore: false, page: 1, pageSize: 10, totalCount: 0, totalPages: 0 } };
      }
      
      // Build query parameters to match what the server expects
      if (import.meta.env.DEV) {
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
        page: page.toString(),
        pageSize: '10' // Fixed page size
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
      
      // Make the request
      console.log(`useRestaurants - fetching page ${page} with params:`, params.toString());
      const response = await fetch(`/api/restaurants?${params.toString()}`);
      
      if (!response.ok) {
        setIsFetchData(false);
        throw new Error('Failed to fetch restaurants');
      }
      
      const data: PaginatedResponse = await response.json();
      console.log(`useRestaurants - received page ${page} with ${data.results.length} results, hasMore: ${data.pagination.hasMore}`);
      
      // Update pagination state
      setHasMore(data.pagination.hasMore);
      
      // If it's the first page, replace all restaurants
      // Otherwise, append to existing restaurants
      if (page === 1) {
        console.log(`useRestaurants - replacing all restaurants with ${data.results.length} results`);
        setAllRestaurants(data.results);
      } else {
        console.log(`useRestaurants - appending ${data.results.length} results to existing ${allRestaurants.length} restaurants`);
        setAllRestaurants(prev => [...prev, ...data.results]);
      }
      setIsFetchData(false);
      return data;
    },
    enabled: isFetchData,
  });
  
  // Use all restaurants from state instead of directly from query
  const restaurants = allRestaurants;
  
  // Function to load more results
  const loadMore = () => {
    if (hasMore) {
      console.log(`useRestaurants - loading more results, incrementing page from ${page} to ${page + 1}`);
      setPage(prevPage => prevPage + 1);
      setIsFetchData(true);
    } else {
      console.log(`useRestaurants - no more results to load`);
    }
  };

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
    setIsFetchData(true);
    if (!filteredRestaurants || filteredRestaurants.length === 0) {
      toast({
        title: "No restaurants available",
        description: "Try adjusting your filters or changing your location.",
        variant: "destructive"
      });
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredRestaurants.length);
    const restaurant = filteredRestaurants[randomIndex];
    
    setHighlightedRestaurant(restaurant);
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
    setIsFetchData(true);
    query.refetch();
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
    loadMore,
    isFetchingMore: query.isFetching && page > 1
  };
}
