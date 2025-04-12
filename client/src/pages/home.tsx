import { useContext } from "react";
import LocationInput from "@/components/LocationInput";
import FilterOptions from "@/components/FilterOptions";
import SuggestionResults from "@/components/SuggestionResults";
import { AppContext } from "@/context/AppContext";

export default function Home() {
  const { isLoading } = useContext(AppContext);

  return (
    <main className="flex-grow container mx-auto px-4 py-6 pb-20 md:pb-6">
      <LocationInput />
      <FilterOptions />
      <SuggestionResults />
    </main>
  );
}
