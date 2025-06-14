import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Restaurant } from '@/types';

const API_URL = process.env.API_URL;

export function useFavorites() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get user favorites
  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      try {
        const response = await fetch(API_URL+'/api/favorites', {
          headers: {
            'user-id': localStorage.getItem('userId') || '',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch favorites');
        }
        
        return response.json();
      } catch (error) {
        console.error('Error fetching favorites:', error);
        throw error;
      }
    },
    enabled: !!localStorage.getItem('userId'),
  });

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: async (restaurant: Restaurant) => {
      const response = await fetch(API_URL+'/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': localStorage.getItem('userId') || '',
        },
        body: JSON.stringify({
          restaurantId: restaurant.place_id || restaurant.fsq_id,
          restaurantData: restaurant,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add to favorites');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({
        title: 'Added to favorites',
        description: 'Restaurant has been added to your favorites',
      });
    },
    onError: (error: Error) => {
      // Don't show error toast if it's already in favorites
      if (error.message.includes('already in favorites')) {
        toast({
          title: 'Already in favorites',
          description: 'This restaurant is already in your favorites',
        });
      } else {
        toast({
          title: 'Failed to add',
          description: error.message || 'Could not add restaurant to favorites',
          variant: 'destructive',
        });
      }
    },
  });

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      const response = await fetch(`${API_URL}/api/favorites/restaurant/${restaurantId}`, {
        method: 'DELETE',
        headers: {
          'user-id': localStorage.getItem('userId') || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove from favorites');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({
        title: 'Removed from favorites',
        description: 'Restaurant has been removed from your favorites',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to remove',
        description: 'Could not remove restaurant from favorites',
        variant: 'destructive',
      });
    },
  });

  // Check if a restaurant is in favorites
  const isInFavorites = (restaurantId: string) => {
    if (!favoritesQuery.data) return false;
    
    return favoritesQuery.data.some(
      (favorite: any) => favorite.restaurantId === restaurantId
    );
  };

  return {
    favorites: favoritesQuery.data || [],
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    error: favoritesQuery.error,
    addToFavorites: addToFavoritesMutation.mutate,
    removeFromFavorites: removeFromFavoritesMutation.mutate,
    isInFavorites,
    refetch: favoritesQuery.refetch,
  };
}