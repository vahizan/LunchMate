import React, { createContext, useState, useEffect, ReactNode, useContext, PropsWithChildren, FunctionComponent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Restaurant, Location, Filters, UserPreferences, VisitHistoryItem } from '@/types';

// Default values
// Helper function to get current time in HH:MM format
const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const DEFAULT_FILTERS: Filters = {
  radius: [0.5],
  cuisines: [],
  dietary: [],
  priceLevel: 2,
  historyDays: 14,
  excludeChains: false,
  excludeCafe: false,
  departureTime: getCurrentTimeString()
};

const DEFAULT_LOCATION: Location = {
  address: "",
  lat: 0,
  lng: 0
};

const defaultAppContext=  
  {
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
}


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
  location: Location|undefined;
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
export const AppContext = createContext<AppContextType>(defaultAppContext);
AppContext.displayName = 'AppContext';

 const AppProvider: FunctionComponent<PropsWithChildren> = ({ children }) =>  {
  console.log("AppProvider initialized - this should only appear ONCE");
  const { toast } = useToast();
  
  // User preferences
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  
  // Restaurants and search
  // Initialize with DEFAULT_LOCATION instead of undefined
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
    console.log("AppProvider - Loading data from localStorage");
    try {
      const savedPrefs = localStorage.getItem('userPreferences');
      if (savedPrefs) {
        console.log("AppProvider - Found userPreferences in localStorage");
        setUserPreferences(JSON.parse(savedPrefs));
      }
      
      const savedFavorites = localStorage.getItem('favorites');
      if (savedFavorites) {
        console.log("AppProvider - Found favorites in localStorage");
        setFavorites(JSON.parse(savedFavorites));
      }
      
      const savedHistory = localStorage.getItem('visitHistory');
      if (savedHistory) {
        console.log("AppProvider - Found visitHistory in localStorage");
        setVisitHistory(JSON.parse(savedHistory));
      }
      
      const savedFilters = localStorage.getItem('filters');
      if (savedFilters) {
        console.log("AppProvider - Found filters in localStorage");
        setFilters(JSON.parse(savedFilters));
      }
      
      const savedLocation = localStorage.getItem('location');
      if (savedLocation) {
        try {
          const parsedLocation = JSON.parse(savedLocation);
          
         
          
          // Ensure lat and lng are numbers
          const validatedLocation = {
            ...parsedLocation,
            lat: Number(parsedLocation.lat),
            lng: Number(parsedLocation.lng)
          };
         
          
          setLocation(validatedLocation);
        } catch (error) {
          console.error("Error parsing location from localStorage:", error);
          // Fall back to default location on error
          setLocation(DEFAULT_LOCATION);
        }
      }
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
  
    // Save location if it exists, regardless of whether lat/lng are 0
    // This fixes the issue where locations with 0 coordinates weren't being saved
    if (location && location.lat !== undefined && location.lng !== undefined) {
      // Ensure lat and lng are stored as numbers
      const locationToStore = {
        ...location,
        lat: Number(location.lat),
        lng: Number(location.lng)
      };
      
     
      
      localStorage.setItem('location', JSON.stringify(locationToStore));
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

export const useAppContext = (): AppContextType =>
  useContext<AppContextType>(AppContext);

export default AppProvider;