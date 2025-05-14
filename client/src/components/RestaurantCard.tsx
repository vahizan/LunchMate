import { useContext } from "react";
import { useLocation } from "wouter";
import { Restaurant } from "@/types";
import { AppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Phone, Globe, MapPin, Clock, Info, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface RestaurantCardProps {
  restaurant: Restaurant;
  highlight?: boolean;
}

export default function RestaurantCard({ restaurant, highlight }: RestaurantCardProps) {
  const [_, navigate] = useLocation();
  const { toggleFavorite, isFavorite } = useContext(AppContext);
  
  const isFavorited = isFavorite(restaurant.place_id);
  const priceLevel = "$".repeat(restaurant.price_level || 1);
  
  const photoUrl = restaurant?.photos?.length && restaurant?.photos[0].large;

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      highlight && "ring-2 ring-primary"
    )}>
      {photoUrl && <div className="relative">
        <img
          src={photoUrl}
          alt={restaurant.name}
          className="w-full h-48 object-cover"
        />
      </div> }
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{restaurant.name}</h3>
            <p className="text-gray-500 text-sm">
              {restaurant.types?.slice(0, 2).join(', ')} • {restaurant.distance?.toFixed(1)} km
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {restaurant.rating && (
              <div className="bg-green-500 text-white rounded px-2 py-1 text-sm font-medium flex items-center">
                <i className="fas fa-star mr-1 text-xs"></i>
                {restaurant.rating.toFixed(1)}
                {restaurant.user_ratings_total && (
                  <span className="ml-1 text-xs">({restaurant.user_ratings_total})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Price and Opening Hours */}
        <div className="flex mt-3 text-sm">
          <span className="mr-2">{priceLevel}</span>
          <span className="text-gray-500">•</span>
          <span className="mx-2">
            {restaurant.opening_hours?.open_now ? 'Open now' : 'Closed'}
          </span>
        </div>

        {/* Address */}
        {restaurant.formatted_address && (
          <div className="mt-3 flex items-start text-sm">
            <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0 text-gray-500" />
            <span className="text-gray-700">{restaurant.formatted_address}</span>
          </div>
        )}

        {/* Phone Number */}
        {restaurant.formatted_phone_number && (
          <div className="mt-2 flex items-center text-sm">
            <Phone className="h-4 w-4 mr-1 text-gray-500" />
            <a href={`tel:${restaurant.formatted_phone_number}`} className="text-blue-600 hover:underline">
              {restaurant.formatted_phone_number}
            </a>
          </div>
        )}

        {/* Website */}
        {restaurant.website && (
          <div className="mt-2 flex items-center text-sm">
            <Globe className="h-4 w-4 mr-1 text-gray-500" />
            <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[250px]">
              {restaurant.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}

        {/* Opening Hours Details */}
        {restaurant.opening_hours?.weekday_text && restaurant.opening_hours.weekday_text.length > 0 && (
          <div className="mt-3">
            <details className="text-sm">
              <summary className="flex items-center cursor-pointer text-gray-700 font-medium">
                <Clock className="h-4 w-4 mr-1 text-gray-500" />
                Opening Hours
              </summary>
              <div className="mt-2 pl-5 text-gray-600">
                {restaurant.opening_hours.weekday_text}
              </div>
            </details>
          </div>
        )}

        {/* Description */}
        {restaurant.description && (
          <div className="mt-3">
            <details className="text-sm">
              <summary className="flex items-center cursor-pointer text-gray-700 font-medium">
                <Info className="h-4 w-4 mr-1 text-gray-500" />
                Description
              </summary>
              <div className="mt-2 pl-5 text-gray-600">
                {restaurant.description}
              </div>
            </details>
          </div>
        )}

        {/* Menu Link */}
        {restaurant.menu && (
          <div className="mt-2 flex items-center text-sm">
            <Menu className="h-4 w-4 mr-1 text-gray-500" />
            <a href={restaurant.menu} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              View Menu
            </a>
          </div>
        )}

        {/* Features */}
        {restaurant.features && (
          <div className="mt-3">
            <details className="text-sm">
              <summary className="flex items-center cursor-pointer text-gray-700 font-medium">
                <Info className="h-4 w-4 mr-1 text-gray-500" />
                Features
              </summary>
              <div className="mt-2 pl-5 grid grid-cols-2 gap-x-2 gap-y-1 text-gray-600">
                {restaurant.features.payment?.credit_cards && (
                  <div className="text-sm">✓ Credit Cards</div>
                )}
                {restaurant.features.payment?.digital_wallet && (
                  <div className="text-sm">✓ Digital Wallet</div>
                )}
                {restaurant.features.food_and_drink?.alcohol && (
                  <div className="text-sm">✓ Serves Alcohol</div>
                )}
                {restaurant.features.food_and_drink?.breakfast && (
                  <div className="text-sm">✓ Breakfast</div>
                )}
                {restaurant.features.food_and_drink?.lunch && (
                  <div className="text-sm">✓ Lunch</div>
                )}
                {restaurant.features.food_and_drink?.dinner && (
                  <div className="text-sm">✓ Dinner</div>
                )}
                {restaurant.features.food_and_drink?.takeout && (
                  <div className="text-sm">✓ Takeout</div>
                )}
                {restaurant.features.food_and_drink?.delivery && (
                  <div className="text-sm">✓ Delivery</div>
                )}
                {restaurant.features.food_and_drink?.reservations && (
                  <div className="text-sm">✓ Reservations</div>
                )}
              </div>
            </details>
          </div>
        )}

        <div className="flex mt-4 space-x-2">
          <Button
            className="flex-1"
            onClick={() => navigate(`/restaurant/${restaurant.place_id}`)}
          >
            View Details
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "w-10 h-10",
              isFavorited && "text-primary border-primary hover:text-primary"
            )}
            onClick={() => toggleFavorite(restaurant)}
          >
            <Heart className={cn("h-5 w-5", isFavorited && "fill-current")} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
