import { useContext } from "react";
import { AppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import RestaurantCard from "./RestaurantCard";
import { Shuffle } from "lucide-react";
import { useRestaurants } from "@/hooks/use-restaurants";

export default function SuggestionResults() {
  const { location, filters, setTeamModalOpen } = useContext(AppContext);
  const { 
    data: restaurants,
    isLoading,
    error,
    refetch,
    pickRandomRestaurant
  } = useRestaurants();

  // Handle random pick button
  const handleRandomPick = () => {
    pickRandomRestaurant();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Suggestions</h2>
        <Button
          onClick={handleRandomPick}
          className="bg-[#FC642D] hover:bg-[#FC642D]/90 text-white"
        >
          <Shuffle className="mr-2 h-4 w-4" />
          Random pick
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
              <div className="p-4">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4 animate-pulse"></div>
                <div className="flex space-x-2">
                  <div className="h-10 bg-gray-200 rounded flex-grow animate-pulse"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error loading restaurants. Please try again.</p>
          <Button onClick={() => refetch()} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && restaurants && restaurants.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-medium mb-2">No restaurants found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or changing your location.</p>
          <Button onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {/* Results */}
      {!isLoading && restaurants && restaurants.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.place_id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
}
