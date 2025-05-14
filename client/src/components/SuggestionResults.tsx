import { useEffect, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import RestaurantCard from "./RestaurantCard";
import { useRestaurants } from "@/hooks/use-restaurants";

// Skeleton loading component for restaurant cards
const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
);

export default function SuggestionResults() {
  const { location, filters, setTeamModalOpen } = useAppContext();
  const {
    data: restaurants,
    isLoading,
    error,
    refetch,
    hasMore,
    loadMoreData,
  } = useRestaurants({limit: '50'});
  
  // Reference to the last loaded item to scroll to
  const lastItemRef = useRef<HTMLDivElement>(null);
  
  // Log when restaurants data changes
  useEffect(() => {
    console.log("SuggestionResults - restaurants data changed:", restaurants?.length);
  }, [restaurants, location, filters]);
  
  // Trigger fetch when component mounts if we have a location
  useEffect(() => {
    if (location?.lat !== undefined && location?.lng !== undefined) {
      console.log("SuggestionResults - triggering fetch on mount");
      refetch();
    }
  }, []);


  
  // Scroll to the last item when new results are loaded
  useEffect(() => {
    if (isLoading === false && lastItemRef.current) {
      lastItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isLoading]);

  // Initial loading state (only shown when no results are loaded yet)
  if (isLoading && (!restaurants || restaurants.length === 0)) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Suggestions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Suggestions</h2>
      </div>

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
      {restaurants && restaurants.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants.map((restaurant, index) => (
              <div
                key={restaurant.place_id}
                ref={index === restaurants.length - 3 ? lastItemRef : null}
              >
                <RestaurantCard restaurant={restaurant} />
              </div>
            ))}
            
            {/* Loading more skeleton cards */}
            {isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={`loading-more-${i}`} />
                ))}
              </>
            )}
          </div>
          
          {/* Load more button */}
          {hasMore && !isLoading && (
            <div className="mt-6 text-center">
              <Button onClick={loadMoreData} variant="outline">
                Load more suggestions
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
