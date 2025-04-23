import { useContext } from "react";
import { useLocation } from "wouter";
import LocationInput from "@/components/LocationInput";
import FilterOptions from "@/components/FilterOptions";
import SuggestionResults from "@/components/SuggestionResults";
import { AppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { useRestaurants } from "@/hooks/use-restaurants";
import { Shuffle, Search } from "lucide-react";

export default function Home() {
  const { isLoading, location } = useContext(AppContext);
  const { hasMore, loadMore, isFetchingMore, pickRandomRestaurant } = useRestaurants();
  const [_, navigate] = useLocation();

  const handleGetSuggestions = () => {
    navigate("/results");
  };

  return (
    <main className="flex-grow container mx-auto px-4 py-6 pb-20 md:pb-6">
      <LocationInput />
      <FilterOptions />
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Button
          onClick={pickRandomRestaurant}
          className="bg-[#FC642D] hover:bg-[#FC642D]/90 text-white py-6 flex-1 text-lg font-medium"
          disabled={!location?.lat || !location?.lng}
        >
          <Shuffle className="mr-2 h-5 w-5" />
          Random Pick
        </Button>
        <Button
          onClick={handleGetSuggestions}
          className="bg-primary hover:bg-primary/90 text-white py-6 flex-1 text-lg font-medium"
          disabled={!location?.lat || !location?.lng}
        >
          <Search className="mr-2 h-5 w-5" />
          Get Suggestions
        </Button>
      </div>
    </main>
  );
}
