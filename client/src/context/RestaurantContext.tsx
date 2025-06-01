import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Restaurant } from "@/types";

interface RestaurantContextType {
  // Selected restaurant for detail view
  selectedRestaurant: Restaurant | null;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  
  // Restaurant results list
  restaurantResults: Restaurant[];
  setRestaurantResults: (results: Restaurant[]) => void;
  
  // Last fetch timestamp to track when results were last updated
  lastFetchTimestamp: number | null;
  setLastFetchTimestamp: (timestamp: number | null) => void;
  
  // Clear results (used when filters change)
  clearResults: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantResults, setRestaurantResults] = useState<Restaurant[]>([]);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(null);

  // Load saved restaurant results from localStorage on mount
  useEffect(() => {
    try {
      const savedResults = localStorage.getItem('restaurantResults');
      const savedTimestamp = localStorage.getItem('lastFetchTimestamp');
      
      if (savedResults) {
        setRestaurantResults(JSON.parse(savedResults));
      }
      
      if (savedTimestamp) {
        setLastFetchTimestamp(JSON.parse(savedTimestamp));
      }
    } catch (error) {
      console.error('Error loading restaurant data from localStorage:', error);
    }
  }, []);

  // Save restaurant results to localStorage when they change
  useEffect(() => {
    if (restaurantResults.length > 0) {
      localStorage.setItem('restaurantResults', JSON.stringify(restaurantResults));
    }
  }, [restaurantResults]);

  // Save timestamp to localStorage when it changes
  useEffect(() => {
    if (lastFetchTimestamp) {
      localStorage.setItem('lastFetchTimestamp', JSON.stringify(lastFetchTimestamp));
    }
  }, [lastFetchTimestamp]);

  // Clear all restaurant results
  const clearResults = () => {
    setRestaurantResults([]);
    setLastFetchTimestamp(null);
    localStorage.removeItem('restaurantResults');
    localStorage.removeItem('lastFetchTimestamp');
  };

  return (
    <RestaurantContext.Provider
      value={{
        selectedRestaurant,
        setSelectedRestaurant,
        restaurantResults,
        setRestaurantResults,
        lastFetchTimestamp,
        setLastFetchTimestamp,
        clearResults
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurantContext() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error("useRestaurantContext must be used within a RestaurantProvider");
  }
  return context;
}