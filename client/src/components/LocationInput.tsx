import { useAppContext } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { LocationInputField } from "./LocationInputField";
import { LocationMap } from "./LocationMap";
import { Location } from "@/types";

export default function LocationInput() {
  const { location, setLocation } = useAppContext();

  // Handle location selection from the input field
  const handleLocationSelected = (newLocation: Location) => {
    setLocation(newLocation);
  };

  // Handle map click (could be used to open a modal with a larger map)
  const handleMapClick = () => {
    console.log("Map clicked, could open a modal with a larger map");
    // Implementation for map modal would go here
  };

  return (
    <div className="mb-6">
      {/* Location Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 pt-4">
          <h2 className="text-lg font-semibold mb-3">Your Location</h2>
          <LocationInputField onLocationSelected={handleLocationSelected} />
        </CardContent>
        
        <LocationMap
          location={location}
          onMapClick={handleMapClick}
        />
      </Card>
    </div>
  );
}
