// Type for location
export interface Location {
    lat: number;
    lng: number;
  }
  
  // Type for filter options
  export interface FilterOptions {
    cuisines?: string[];
    dietary?: string[];
    priceLevel?: number;
  }
  
  export interface Place {
    fsq_id: string;
    name: string;
    location: {
      address?: string;
      locality?: string;
      region?: string;
      postcode?: string;
      country?: string;
      formatted_address?: string;
      dma?: string;
      cross_street?: string;
      neighborhood?: string[];
    };
    geocodes: {
      main: {
        latitude: number;
        longitude: number;
      };
      roof?: {
        latitude: number;
        longitude: number;
      };
    };
    categories: Array<{
      id: number;
      name: string;
      icon: {
        prefix: string;
        suffix: string;
      };
      short_name?: string;
    }>;
    distance?: number;
    rating?: number;
    price?: number;
    photos?: Array<{
      id: string;
      created_at: string;
      prefix: string;
      suffix: string;
      width: number;
      height: number;
    }>;
    hours?: {
      display?: string[];
      is_open_now?: boolean;
      open_now?: boolean;
      regular?: Array<{
        close: string;
        day: number;
        open: string;
      }>;
    };
    website?: string;
    tel?: string;
    stats?: {
      total_ratings?: number;
      total_tips?: number;
      total_photos?: number;
      total_checkins?: number;
    };
    description?: string;
    verified?: boolean;
    chains?: Array<{
      id: string;
      name: string;
    }>;
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
    popularity?: number;
    tastes?: string[];
    menu?: string;
    tips?: Array<{
      id: string;
      created_at: string;
      text: string;
      url: string;
      lang: string;
      count: number;
      likes: {
        count: number;
        summary: string;
      };
    }>;
  }
  