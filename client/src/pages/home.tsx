import { useEffect } from "react";
import { useLocation } from "wouter";
import LocationInput from "@/components/LocationInput";
import FilterOptions from "@/components/FilterOptions";
import {  useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { useRestaurants } from "@/hooks/use-restaurants";
import { Shuffle, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import RestaurantCard from "@/components/RestaurantCard";

export default function Home() {
  const { isLoading, location } = useAppContext();
  const { pickRandomRestaurant, highlightedRestaurant } = useRestaurants();

  useEffect(() => {
    console.log("highlighted Restaurant", highlightedRestaurant);
    if(!highlightedRestaurant) return;

    toast({
      title: "Random pick for you",
      description: `We've selected ${highlightedRestaurant.name} for you!`,
    });
    
    // Scroll to the restaurant card
    setTimeout(() => {
      const element = document.getElementById(`restaurant-${highlightedRestaurant.place_id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [highlightedRestaurant])

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
          disabled={location?.lat === undefined || location?.lng === undefined}
        >
          <Shuffle className="mr-2 h-5 w-5" />
          Random Pick
        </Button>
        <Button
          onClick={handleGetSuggestions}
          className="bg-primary hover:bg-primary/90 text-white py-6 flex-1 text-lg font-medium"
          disabled={location?.lat === undefined || location?.lng === undefined}
        >
          <Search className="mr-2 h-5 w-5" />
          Get Suggestions
        </Button>
      </div>
      {highlightedRestaurant && <RestaurantCard restaurant={highlightedRestaurant} highlight/> }
    </main>
  );
}
