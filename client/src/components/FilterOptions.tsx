import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { FOOD_CATEGORIES } from "@/../../shared/types";

// Helper function to get current time in HH:MM format
const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// Define cuisine types and dietary restrictions
const CUISINE_TYPES = [
  FOOD_CATEGORIES.ITALIAN, FOOD_CATEGORIES.JAPANESE, FOOD_CATEGORIES.INDIAN, FOOD_CATEGORIES.CHINESE,
  FOOD_CATEGORIES.MEXICAN, FOOD_CATEGORIES.AMERICAN, FOOD_CATEGORIES.THAI, FOOD_CATEGORIES.FRENCH,
  FOOD_CATEGORIES.SPANISH, FOOD_CATEGORIES.GREEK, FOOD_CATEGORIES.KOREAN
];

// Extended cuisine types for the dialog
const EXTENDED_CUISINE_TYPES = [
  ...CUISINE_TYPES, FOOD_CATEGORIES.VIETNAMESE,
  FOOD_CATEGORIES.MEDITERRANEAN, FOOD_CATEGORIES.MIDDLE_EASTERN, FOOD_CATEGORIES.CARIBBEAN,
  FOOD_CATEGORIES.BRAZILIAN, FOOD_CATEGORIES.GERMAN, FOOD_CATEGORIES.BRITISH, FOOD_CATEGORIES.IRISH,
  FOOD_CATEGORIES.AFRICAN, FOOD_CATEGORIES.SEAFOOD, FOOD_CATEGORIES.BBQ, FOOD_CATEGORIES.PIZZA,
  FOOD_CATEGORIES.BURGER, FOOD_CATEGORIES.VEGETARIAN, FOOD_CATEGORIES.VEGAN
];

const DIETARY_RESTRICTIONS = [
  "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Dairy-free", "Nut-free"
];

export const FilterOptions = () => {
  const {
    filters,
    setFilters,
    resetFilters
  } = useAppContext();

  // Local state for each filter option
  const [currentRadius, setCurrentRadius] = useState<number[]>();
  const [currentCuisines, setCurrentCuisines] = useState<string[]>();
  const [currentDietary, setCurrentDietary] = useState<string[]>();
  const [currentPriceLevel, setCurrentPriceLevel] = useState<number>();
  const [currentHistoryDays, setCurrentHistoryDays] = useState<number>();
  const [currentExcludeChains, setCurrentExcludeChains] = useState<boolean>();
  const [currentExcludeCafe, setCurrentExcludeCafe] = useState<boolean>();
  const [currentDepartureTime, setCurrentDepartureTime] = useState<string>();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [customCuisine, setCustomCuisine] = useState<string>("");

  // Initialize local state from filters
  useEffect(() => {
    setCurrentRadius(filters.radius);
    setCurrentCuisines(filters.cuisines);
    setCurrentDietary(filters.dietary);
    setCurrentPriceLevel(filters.priceLevel);
    setCurrentHistoryDays(filters.historyDays);
    setCurrentExcludeChains(filters.excludeChains);
    setCurrentExcludeCafe(filters.excludeCafe);
    setCurrentDepartureTime(filters.departureTime);
  }, [filters]);

  // Generic function to toggle array items (for cuisines and dietary restrictions)
  const toggleArrayItem = <T,>(
    currentItems: T[] | undefined,
    setCurrentItems: React.Dispatch<React.SetStateAction<T[] | undefined>>,
    item: T,
    filterKey: 'cuisines' | 'dietary'
  ) => {
    const updatedItems = currentItems?.includes(item)
      ? currentItems.filter(i => i !== item)
      : [...(currentItems || []), item];
    
    setCurrentItems(updatedItems);
    
    // Create a completely new object to ensure reference changes
    const newFilters = {
      ...filters,
      [filterKey]: [...updatedItems]
    };
    console.log("FilterOptions - toggleArrayItem - updating filters:", newFilters);
    setFilters(newFilters);
  };

  // Handlers for each filter option
  const handleRadiusChange = (value: number[]) => {
    setCurrentRadius(value);
    
    // Create a completely new object to ensure reference changes
    const newFilters = {
      ...filters,
      radius: [...value]
    };
    console.log("FilterOptions - handleRadiusChange - updating filters:", newFilters);
    setFilters(newFilters);
  };

  const toggleCuisine = (cuisine: string) => {
    toggleArrayItem(currentCuisines, setCurrentCuisines, cuisine, 'cuisines');
  };

  const toggleDietary = (dietary: string) => {
    toggleArrayItem(currentDietary, setCurrentDietary, dietary, 'dietary');
  };

  // Filter extended cuisine types based on search term
  const filteredCuisines = EXTENDED_CUISINE_TYPES.filter(cuisine =>
    cuisine.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add custom cuisine to filters
  const addCustomCuisine = () => {
    if (customCuisine.trim() !== "") {
      // Convert custom cuisine to lowercase for consistency
      const customCuisineValue = customCuisine.toLowerCase() as FOOD_CATEGORIES;
      if (!currentCuisines?.includes(customCuisineValue)) {
        toggleArrayItem(currentCuisines, setCurrentCuisines, customCuisineValue, 'cuisines');
        setCustomCuisine("");
      }
    }
  };

  // Handle cuisine selection from dialog
  const handleCuisineSelect = (cuisine: FOOD_CATEGORIES) => {
    toggleArrayItem(currentCuisines, setCurrentCuisines, cuisine, 'cuisines');
  };

  const setPriceLevel = (price: number) => {
    setCurrentPriceLevel(price);
    
    // Create a completely new object to ensure reference changes
    const newFilters = {
      ...filters,
      priceLevel: price
    };
    console.log("FilterOptions - setPriceLevel - updating filters:", newFilters);
    setFilters(newFilters);
  };

  const handleHistoryDaysChange = (value: string) => {
    const days = parseInt(value);
    setCurrentHistoryDays(days);
    
    // Create a completely new object to ensure reference changes
    const newFilters = {
      ...filters,
      historyDays: days
    };
    console.log("FilterOptions - handleHistoryDaysChange - updating filters:", newFilters);
    setFilters(newFilters);
  };

  const handleExcludeChainsChange = (checked: boolean) => {
    setCurrentExcludeChains(checked);
    
    // Create a completely new object to ensure reference changes
    const newFilters = {
      ...filters,
      excludeChains: checked
    };
    console.log("FilterOptions - handleExcludeChainsChange - updating filters:", newFilters);
    setFilters(newFilters);
  };

  const handleExcludeCafeChange = (checked: boolean) => {
    // Create a completely new object to ensure reference changes
    const newFilters = {
      ...filters,
      excludeCafe: checked
    };
    console.log("FilterOptions - handleExcludeCafeChange - updating filters:", newFilters);
    setFilters(newFilters);
    setCurrentExcludeCafe(checked);
  };

  const handleDepartureTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setCurrentDepartureTime(time);
    
    // Create a completely new object to ensure reference changes
    const newFilters = {
      ...filters,
      departureTime: time
    };
    console.log("FilterOptions - handleDepartureTimeChange - updating filters:", newFilters);
    setFilters(newFilters);
  };

  return (
    <div className="mb-6">
      <Card>
        <CardContent className="p-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            <Button variant="ghost" className="text-primary h-auto p-0 text-sm" onClick={() => {
              setCurrentCuisines([]);
              setCurrentDietary([]);
              setPriceLevel(1);
              setCurrentRadius([0.2]);
              setCurrentHistoryDays(14);
              setCurrentExcludeChains(false);
              setCurrentExcludeCafe(false);
              setCurrentDepartureTime(getCurrentTimeString());
              console.log("FilterOptions - reset button clicked");
              resetFilters();
            }}>
              Reset all
            </Button>
          </div>

          {/* Search Radius */}
          <div className="mb-6">
            {currentRadius && <Label htmlFor="radius-slider" className="block text-sm font-medium text-gray-500 mb-2">
              Search radius: <span className="text-gray-800 font-semibold">{currentRadius[0]} km</span>
            </Label>}
            <Slider
              name="radius-slider"
              defaultValue={!!filters.radius.length ? filters.radius : [0.2]}
              value={currentRadius}
              min={0.2}
              max={5}
              step={0.1}
              onValueChange={handleRadiusChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.2 km (Min)</span>
              <span>5 km (Max)</span>
            </div>
          </div>

          {/* Departure Time */}
          <div className="mb-6">
            <Label htmlFor="departure-time" className="block text-sm font-medium text-gray-500 mb-2">
              Departure time
            </Label>
            <Input
              id="departure-time"
              type="time"
              value={currentDepartureTime}
              onChange={handleDepartureTimeChange}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              When you plan to leave for lunch
            </div>
          </div>

          {/* Cuisine Types */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-500 mb-2">
              Cuisine type
            </Label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_TYPES.map((cuisine) => (
                <Button
                  key={cuisine}
                  variant="outline"
                  className={cn(
                    "px-3 py-1 h-auto rounded-full text-sm font-medium transition-all",
                    currentCuisines?.includes(cuisine)
                      ? "bg-primary text-white border-primary hover:bg-primary/90 hover:text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  )}
                  onClick={() => toggleCuisine(cuisine)}
                >
                  {/* Capitalize first letter of each word */}
                  {cuisine.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Button>
              ))}
              
              {/* Choose Other Cuisine Dialog */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="px-3 py-1 h-auto rounded-full text-sm font-medium transition-all bg-gray-100 text-gray-800 hover:bg-gray-200 flex items-center gap-1"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Choose other
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select or add a cuisine</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search or enter a custom cuisine"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          setCustomCuisine(searchTerm);
                          addCustomCuisine();
                          setSearchTerm("");
                        }}
                        disabled={!searchTerm.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-72">
                      <div className="grid grid-cols-2 gap-2">
                        {filteredCuisines.map((cuisine) => (
                          <Button
                            key={cuisine}
                            variant="outline"
                            className={cn(
                              "justify-start h-auto py-2",
                              currentCuisines?.includes(cuisine)
                                ? "bg-primary text-white border-primary"
                                : "border-gray-200"
                            )}
                            onClick={() => {
                              handleCuisineSelect(cuisine);
                            }}
                          >
                            {/* Capitalize first letter of each word */}
                            {cuisine.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Display custom cuisines that aren't in the default list */}
              {currentCuisines?.filter(cuisine => !CUISINE_TYPES.includes(cuisine as FOOD_CATEGORIES)).map((cuisine) => (
                <Button
                  key={cuisine}
                  variant="outline"
                  className="bg-primary text-white border-primary hover:bg-primary/90 hover:text-white px-3 py-1 h-auto rounded-full text-sm font-medium transition-all"
                  onClick={() => toggleCuisine(cuisine)}
                >
                  {/* Capitalize first letter of each word */}
                  {cuisine.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-500 mb-2">
              Dietary restrictions
            </Label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_RESTRICTIONS.map((dietary) => (
                <Button
                  key={dietary}
                  variant="outline"
                  className={cn(
                    "px-3 py-1 h-auto rounded-full text-sm font-medium transition-all",
                    currentDietary?.includes(dietary)
                      ? "bg-primary text-white border-primary hover:bg-primary/90 hover:text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  )}
                  onClick={() => toggleDietary(dietary)}
                >
                  {dietary}
                </Button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-500 mb-2">
              Price range
            </Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((price) => (
                <Button
                  key={price}
                  variant="outline"
                  className={cn(
                    "flex-1 py-2",
                    currentPriceLevel === price
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 hover:bg-gray-100"
                  )}
                  onClick={() => setPriceLevel(price)}
                >
                  {"$".repeat(price)}
                </Button>
              ))}
            </div>
          </div>

          {/* History Filter */}
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-2">
              Avoid places visited in the last
            </Label>
            <Select
              value={currentHistoryDays?.toString()}
              onValueChange={handleHistoryDaysChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="0">Don't avoid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Exclude Chain Restaurants */}
          <div className="mt-6 flex items-center space-x-2">
            <Checkbox
              id="exclude-chains"
              checked={currentExcludeChains}
              onCheckedChange={handleExcludeChainsChange}
            />
            <Label
              htmlFor="exclude-chains"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Exclude chain restaurants
            </Label>
          </div>

          {/* Exclude Cafes */}
          <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="exclude-cafe"
              checked={currentExcludeCafe}
              onCheckedChange={handleExcludeCafeChange}
            />
            <Label
              htmlFor="exclude-cafe"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Exclude cafes and coffee shops
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FilterOptions;