import { useAppContext } from "@/context/AppContext";
import SuggestionResults from "@/components/SuggestionResults";

export default function Results() {
  const { location, filters } = useAppContext();

  return (
    <main className="flex-grow container mx-auto px-4 py-6 pb-20 md:pb-6">
     <SuggestionResults/>
    </main>
  );
}