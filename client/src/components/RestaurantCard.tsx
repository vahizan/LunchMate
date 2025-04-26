import { useContext } from "react";
import { useLocation } from "wouter";
import { Restaurant } from "@/types";
import { AppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
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
  
  const photoUrl = restaurant?.photos?.length && restaurant?.photos[0].small;

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
          {restaurant.rating && (
            <div className="bg-green-500 text-white rounded px-2 py-1 text-sm font-medium flex items-center">
              <i className="fas fa-star mr-1 text-xs"></i>
              {restaurant.rating.toFixed(1)}
            </div>
          )}
        </div>
        <div className="flex mt-3 text-sm">
          <span className="mr-2">{priceLevel}</span>
          <span className="text-gray-500">•</span>
          <span className="mx-2">
            {restaurant.opening_hours?.open_now ? 'Open now' : 'Closed'}
          </span>
        </div>
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
