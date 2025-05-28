// Location type
export interface Location {
  address: string;
  lat: number;
  lng: number;
}

// Filters for restaurant search
export interface Filters {
  radius: number[];
  cuisines: string[];
  dietary: string[];
  priceLevel: number;
  historyDays: number;
  excludeChains: boolean;
  excludeCafe: boolean;
  departureTime: string;
}

// Restaurant type - based on Google Places API with some additions
export interface Restaurant {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  photos?: Array<{
    id: string;
    created_at: string;
    small: string;
    large: string;
    xlarge: string;
  }>;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  distance?: number;
  formatted_phone_number?: string;
  website?: string;
  open_now?: boolean;
  
  // Additional Foursquare fields
  description?: string;
  menu?: string;
  popularity?: number;
  features?: {
    payment?: {
      credit_cards?: boolean;
      digital_wallet?: boolean;
    };
    food_and_drink?: {
      alcohol?: boolean;
      breakfast?: boolean;
      dinner?: boolean;
      lunch?: boolean;
      takeout?: boolean;
      delivery?: boolean;
      reservations?: boolean;
    };
  };
  
  // Travel information
  travel_time?: number; // in minutes
  travel_distance?: number; // in kilometers
  estimated_arrival_time?: string; // ISO string
  
  // Crowd information
  crowd_level?: 'busy' | 'moderate' | 'not_busy';
  peak_hours?: Array<{
    day: string; // e.g., 'Monday', 'Tuesday', etc.
    hour: number; // 0-23
    level: 'busy' | 'moderate' | 'not_busy';
  }>;
  average_time_spent?: string;
  
  // Custom additions
  votes?: number;
  hasVoted?: boolean;
}

// User preferences
export interface UserPreferences {
  name?: string;
  email?: string;
  defaultLocation?: Location;
  favoriteCuisines?: string[];
}

// Visit history item
export interface VisitHistoryItem {
  id: string;
  name: string;
  visitDate: string;
}

// Team type
export interface Team {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  suggestions: Array<{
    restaurantId: string;
    votes: string[];
  }>;
}
