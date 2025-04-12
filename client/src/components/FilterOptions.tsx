import { useContext, useState } from "react";
import { AppContext } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Define cuisine types and dietary restrictions
const CUISINE_TYPES = [
  "Italian", "Japanese", "Indian", "Chinese", "Mexican", "American", "Thai", "French", "Spanish", "Greek", "Korean"
];

const DIETARY_RESTRICTIONS = [
  "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Dairy-free", "Nut-free"
];

export default function FilterOptions() {
  const { 
    filters, 
    setFilters,
    resetFilters
  } = useContext(AppContext);

  const handleRadiusChange = (value: number[]) => {
    setFilters({ ...filters, radius: value[0] });
  };

  const toggleCuisine = (cuisine: string) => {
    const updatedCuisines = filters.cuisines.includes(cuisine)
      ? filters.cuisines.filter(c => c !== cuisine)
      : [...filters.cuisines, cuisine];
    
    setFilters({ ...filters, cuisines: updatedCuisines });
  };

  const toggleDietary = (dietary: string) => {
    const updatedDietary = filters.dietary.includes(dietary)
      ? filters.dietary.filter(d => d !== dietary)
      : [...filters.dietary, dietary];
    
    setFilters({ ...filters, dietary: updatedDietary });
  };

  const setPriceLevel = (price: number) => {
    setFilters({ ...filters, priceLevel: price });
  };

  const handleHistoryDaysChange = (value: string) => {
    setFilters({ ...filters, historyDays: parseInt(value) });
  };

  return (
    <div className="mb-6">
      <Card>
        <CardContent className="p-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            <Button variant="ghost" className="text-primary h-auto p-0 text-sm" onClick={resetFilters}>
              Reset all
            </Button>
          </div>

          {/* Search Radius */}
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-500 mb-2">
              Search radius: <span className="text-gray-800 font-semibold">{filters.radius.toFixed(1)} km</span>
            </Label>
            <Slider
              value={[filters.radius]}
              min={0.2}
              max={5}
              step={0.1}
              onValueChange={handleRadiusChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.2 km</span>
              <span>5 km</span>
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
                    filters.cuisines.includes(cuisine) 
                      ? "bg-primary text-white border-primary hover:bg-primary/90 hover:text-white" 
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  )}
                  onClick={() => toggleCuisine(cuisine)}
                >
                  {cuisine}
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
                    filters.dietary.includes(dietary) 
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
                    filters.priceLevel === price 
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
              value={filters.historyDays.toString()} 
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
        </CardContent>
      </Card>
    </div>
  );
}
