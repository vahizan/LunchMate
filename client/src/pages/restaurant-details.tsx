import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { AppContext } from "@/context/AppContext";
import { Restaurant } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  MapPin, Star, Clock, DollarSign, Phone, Globe, ArrowLeft, Menu, Users, Timer, Heart
} from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useRestaurantContext } from "@/context/RestaurantContext";

export default function RestaurantDetails() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { addToHistory } = useContext(AppContext);
  const {
    addToFavorites,
    removeFromFavorites,
    isInFavorites
  } = useFavorites();
  
  // Get restaurant data from context if available
  const { selectedRestaurant } = useRestaurantContext();

  // Only fetch from API if we don't have data in context
  const { data: fetchedRestaurant, isLoading } = useQuery<Restaurant>({
    queryKey: [`/api/restaurants/${id}`],
    enabled: !selectedRestaurant, // Only run the query if we don't have data in context
  });

  // Use context data if available, otherwise use fetched data
  const restaurant = selectedRestaurant || fetchedRestaurant;

  // When visiting a restaurant detail page, add it to history
  useEffect(() => {
    if (restaurant) {
      addToHistory(restaurant);
    }
  }, [restaurant, addToHistory]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg w-full mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="h-24 bg-gray-200 rounded w-full mb-4"></div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <p>Restaurant not found</p>
            <Button 
              onClick={() => navigate('/results')}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to results
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priceSymbol = "$".repeat(restaurant.price_level || 1);

  return (
    <div className="container mx-auto px-4 py-8 pb-20 md:pb-8">
      <Button
        variant="outline"
        className="mb-4"
        onClick={() => navigate('/results')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to results
      </Button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {restaurant.photos && restaurant.photos[0] && (
          <div className="w-full h-64 relative">
            <img
              src={restaurant.photos[0].large}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-1">{restaurant.name}</h1>
              <p className="text-gray-600 mb-4">
                {restaurant.types?.slice(0, 3).join(', ')}
              </p>
            </div>
            {restaurant.rating && (
              <div className="bg-green-500 text-white px-2 py-1 rounded flex items-center">
                <Star className="w-4 h-4 mr-1" /> 
                {restaurant.rating.toFixed(1)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 mb-6">
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{restaurant.distance?.toFixed(1)} km</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-1" />
              <span>{restaurant?.opening_hours?.open_now ? 'Open now' : 'Closed'}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <DollarSign className="w-4 h-4 mr-1" />
              <span>{priceSymbol}</span>
            </div>
            {restaurant.user_ratings_total && (
              <div className="flex items-center text-gray-600">
                <Star className="w-4 h-4 mr-1" />
                <span>{restaurant.user_ratings_total} reviews</span>
              </div>
            )}
            {restaurant.crowd_level && (
              <div className={`flex items-center text-white rounded px-2 py-1 text-sm ${
                restaurant.crowd_level === 'busy' ? 'bg-red-500' :
                restaurant.crowd_level === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
              }`}>
                <Users className="h-3 w-3 mr-1" />
                {restaurant.crowd_level === 'busy' ? 'Busy' :
                 restaurant.crowd_level === 'moderate' ? 'Moderate' : 'Not Busy'}
              </div>
            )}
          </div>

          {restaurant.formatted_address && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Address</h2>
              <p className="text-gray-600">{restaurant.formatted_address}</p>
            </div>
          )}

          {restaurant.formatted_phone_number && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">Contact</h2>
              <p className="flex items-center text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                {restaurant.formatted_phone_number}
              </p>
              {restaurant.website && (
                <p className="flex items-center text-gray-600 mt-1">
                  <Globe className="w-4 h-4 mr-2" />
                  <a 
                    href={restaurant.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {restaurant.website}
                  </a>
                </p>
              )}
            </div>
            )}
  
            {restaurant.opening_hours?.weekday_text && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Opening Hours</h2>
              <ul className="text-gray-600">
                {restaurant.opening_hours.weekday_text}
              </ul>
            </div>
          )}

          {restaurant.menu && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Menu</h2>
              <p className="flex items-center text-gray-600">
                <Menu className="w-4 h-4 mr-2" />
                <a
                  href={restaurant.menu}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View Menu
                </a>
              </p>
            </div>
          )}
  
          {/* Average Time Spent */}
          {(restaurant.averageTimeSpent || restaurant.average_time_spent) &&
           ((restaurant.averageTimeSpent && restaurant.averageTimeSpent !== 'unknown') ||
            (restaurant.average_time_spent && restaurant.average_time_spent !== 'unknown')) && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Average Visit Duration</h2>
              <p className="flex items-center text-gray-600">
                <Timer className="w-4 h-4 mr-2" />
                {restaurant.averageTimeSpent || restaurant.average_time_spent}
              </p>
            </div>
          )}
  
          <div className="mt-8 flex gap-2">
            <Button
              className="flex-1"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${restaurant.name}&destination_place_id=${restaurant.place_id}`, '_blank')}
            >
              <MapPin className="mr-2 h-4 w-4" /> Get Directions
            </Button>
            
            {isInFavorites(restaurant.place_id || restaurant.fsq_id || '') ? (
              <Button
                variant="outline"
                className="flex-none"
                onClick={() => removeFromFavorites(restaurant.place_id || restaurant.fsq_id || '')}
              >
                <Heart className="h-4 w-4 fill-current text-red-500" />
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-none"
                onClick={() => addToFavorites(restaurant)}
              >
                <Heart className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
