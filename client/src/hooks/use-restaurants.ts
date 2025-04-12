import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '@/context/AppContext';
import { Restaurant } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useRestaurants() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { location, filters, visitHistory } = useContext(AppContext);
  const [highlightedRestaurant, setHighlightedRestaurant] = useState<string | null>(null);
  
  // Query to get restaurants based on location and filters
  const query = useQuery({
    queryKey: ['/api/restaurants', location, filters],
    enabled: Boolean(location.lat && location.lng),
  });

  const restaurants = query.data as Restaurant[];

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
  const pickRandomRestaurant = () => {
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
    
    setHighlightedRestaurant(restaurant.place_id);
    
    toast({
      title: "Random pick",
      description: `We've selected ${restaurant.name} for you!`,
    });
    
    // Scroll to the restaurant card
    setTimeout(() => {
      const element = document.getElementById(`restaurant-${restaurant.place_id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedRestaurant(null);
    }, 3000);
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

  return {
    data: filteredRestaurants,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    pickRandomRestaurant,
    addToTeam: addToTeamMutation.mutate,
    highlightedRestaurantId: highlightedRestaurant
  };
}
