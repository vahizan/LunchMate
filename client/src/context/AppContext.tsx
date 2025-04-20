import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Restaurant, Location, Filters, UserPreferences, VisitHistoryItem } from '@/types';

// Default values
const DEFAULT_FILTERS: Filters = {
  radius: [0.5],
  cuisines: [],
  dietary: [],
  priceLevel: 2,
  historyDays: 14
};

const DEFAULT_LOCATION: Location = {
  address: "",
  lat: 0,
  lng: 0
};

interface AppContextType {
  // User related
  userPreferences: UserPreferences | null;
  setUserPreferences: (prefs: UserPreferences) => void;
  
  // Favorites
  favorites: Restaurant[];
  toggleFavorite: (restaurant: Restaurant) => void;
  isFavorite: (id: string) => boolean;
  
  // Visit history
  visitHistory: VisitHistoryItem[];
  addToHistory: (restaurant: Restaurant) => void;
  removeFromHistory: (id: string) => void;
  clearVisitHistory: () => void;
  
  // Filters and search
  location: Location;
  setLocation: (location: Location) => void;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  resetFilters: () => void;
  
  // Restaurants
  restaurants: Restaurant[];
  setRestaurants: (restaurants: Restaurant[]) => void;
  
  // Loading state
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  
  // Team modal
  teamModalOpen: boolean;
  setTeamModalOpen: (open: boolean) => void;
}

export const AppContext = createContext<AppContextType>({
  userPreferences: null,
  setUserPreferences: () => {},
  favorites: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
  visitHistory: [],
  addToHistory: () => {},
  removeFromHistory: () => {},
  clearVisitHistory: () => {},
  location: DEFAULT_LOCATION,
  setLocation: () => {},
  filters: DEFAULT_FILTERS,
  setFilters: () => {},
  resetFilters: () => {},
  restaurants: [],
  setRestaurants: () => {},
  isLoading: false,
  setIsLoading: () => {},
  teamModalOpen: false,
  setTeamModalOpen: () => {}
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  
  // User preferences
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  
  // Restaurants and search
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  
  // Favorites
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  
  // Visit history
  const [visitHistory, setVisitHistory] = useState<VisitHistoryItem[]>([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Team modal
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  
  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem('userPreferences');
      if (savedPrefs) setUserPreferences(JSON.parse(savedPrefs));
      
      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      
      const savedHistory = localStorage.getItem('visitHistory');
      if (savedHistory) setVisitHistory(JSON.parse(savedHistory));
      
      const savedFilters = localStorage.getItem('filters');
      if (savedFilters) setFilters(JSON.parse(savedFilters));
      
      const savedLocation = localStorage.getItem('location');
      if (savedLocation) setLocation(JSON.parse(savedLocation));
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);
  
  // Save data to localStorage when it changes
  useEffect(() => {
    if (userPreferences) localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
  }, [userPreferences]);
  
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);
  
  useEffect(() => {
    localStorage.setItem('visitHistory', JSON.stringify(visitHistory));
  }, [visitHistory]);
  
  useEffect(() => {
    console.log("SAVE FILTERS", filters);
    localStorage.setItem('filters', JSON.stringify(filters));
  }, [filters]);
  
  useEffect(() => {
    if (location.lat && location.lng) {
      localStorage.setItem('location', JSON.stringify(location));
    }
  }, [location]);
  
  // Favorites management
  const toggleFavorite = (restaurant: Restaurant) => {
    const isFav = favorites.some(fav => fav.place_id === restaurant.place_id);
    
    if (isFav) {
      setFavorites(favorites.filter(fav => fav.place_id !== restaurant.place_id));
      toast({
        title: "Removed from favorites",
        description: `${restaurant.name} has been removed from your favorites`,
      });
    } else {
      setFavorites([...favorites, restaurant]);
      toast({
        title: "Added to favorites",
        description: `${restaurant.name} has been added to your favorites`,
      });
    }
  };
  
  const isFavorite = (id: string) => favorites.some(fav => fav.place_id === id);
  
  // Visit history management
  const addToHistory = (restaurant: Restaurant) => {
    const visitItem: VisitHistoryItem = {
      id: restaurant.place_id,
      name: restaurant.name,
      visitDate: new Date().toISOString(),
    };
    
    // Don't add duplicate entries for the same day
    const isSameDay = visitHistory.some(visit => {
      const visitDate = new Date(visit.visitDate);
      const today = new Date();
      return visit.id === restaurant.place_id && 
        visitDate.getDate() === today.getDate() &&
        visitDate.getMonth() === today.getMonth() &&
        visitDate.getFullYear() === today.getFullYear();
    });
    
    if (!isSameDay) {
      setVisitHistory([visitItem, ...visitHistory]);
    }
  };
  
  const removeFromHistory = (id: string) => {
    setVisitHistory(visitHistory.filter(visit => visit.id !== id));
  };
  
  const clearVisitHistory = () => {
    setVisitHistory([]);
    toast({
      title: "History cleared",
      description: "Your visit history has been cleared",
    });
  };
  
  // Reset filters to default
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    toast({
      title: "Filters reset",
      description: "All filters have been reset to default values",
    });
  };
  
  return (
    <AppContext.Provider
      value={{
        userPreferences,
        setUserPreferences,
        favorites,
        toggleFavorite,
        isFavorite,
        visitHistory,
        addToHistory,
        removeFromHistory,
        clearVisitHistory,
        location,
        setLocation,
        filters,
        setFilters,
        resetFilters,
        restaurants,
        setRestaurants,
        isLoading,
        setIsLoading,
        teamModalOpen,
        setTeamModalOpen
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
