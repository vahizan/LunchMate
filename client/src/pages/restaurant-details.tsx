import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { AppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  MapPin, Star, Clock, DollarSign, Phone, Globe, ArrowLeft
} from "lucide-react";

export default function RestaurantDetails() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { addToHistory } = useContext(AppContext);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: [`/api/restaurants/${id}`],
  });

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
              onClick={() => navigate('/')}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Go back
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
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to results
      </Button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {restaurant.photos && restaurant.photos[0] && (
          <div className="w-full h-64 relative">
            <img 
              src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photoreference=${restaurant.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`} 
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
              <span>{restaurant.open_now ? 'Open now' : 'Closed'}</span>
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
                {restaurant.opening_hours.weekday_text.map((day, index) => (
                  <li key={index} className="mb-1">{day}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex">
            <Button 
              className="w-full"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${restaurant.name}&destination_place_id=${restaurant.place_id}`, '_blank')}
            >
              <MapPin className="mr-2 h-4 w-4" /> Get Directions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
