import { useContext, useEffect } from "react";
import { AppContext, useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import RestaurantCard from "@/components/RestaurantCard";
import { useRestaurants } from "@/hooks/use-restaurants";
import { useLocation } from "wouter";

export default function Results() {
  const { location, filters } = useAppContext();
  const [_, navigate] = useLocation();
  const { 
    data: restaurants,
    isLoading,
    error,
    refetch,
    hasMore,
    loadMore,
    isFetchingMore
  } = useRestaurants();

  // If no location is set, redirect back to home
  useEffect(() => {
    if (!location?.lat || !location?.lng) {
      navigate("/");
    }
  }, [location, navigate]);

  return (
    <main className="flex-grow container mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Suggestion Results</h2>
        <Button 
          onClick={() => navigate("/")}
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10"
        >
          Back to Filters
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
          <Button onClick={() => navigate("/")}>
            Back to Filters
          </Button>
        </div>
      )}

      {/* Results */}
      {!isLoading && restaurants && restaurants.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.place_id} restaurant={restaurant} />
            ))}
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-8 mb-6">
              <Button
                onClick={loadMore}
                disabled={isFetchingMore}
                className="bg-[#FC642D] hover:bg-[#FC642D]/90 text-white"
              >
                {isFetchingMore ? "Loading..." : "Load More Suggestions"}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}