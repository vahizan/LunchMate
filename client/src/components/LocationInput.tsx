import { useContext, useEffect, useRef } from "react";
import { AppContext } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";
import { useGooglePlaces } from "@/hooks/use-google-places";

export default function LocationInput() {
  const { 
    location, 
    setLocation, 
    userPreferences
  } = useContext(AppContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { initAutocomplete, showMap } = useGooglePlaces();

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (inputRef.current) {
      initAutocomplete(inputRef.current, (place) => {
        if (place.geometry?.location) {
          setLocation({
            address: place.formatted_address || place.name || "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
    }
  }, [initAutocomplete, setLocation]);

  // Initialize map with default location if user has preferences
  useEffect(() => {
    if (mapContainerRef.current && userPreferences?.defaultLocation) {
      showMap(mapContainerRef.current, {
        lat: userPreferences.defaultLocation.lat || 0,
        lng: userPreferences.defaultLocation.lng || 0
      });
    }
  }, [userPreferences, showMap]);

  return (
    <div className="mb-6">
      <Card className="overflow-hidden">
        <CardContent className="p-4 pt-4">
          <h2 className="text-lg font-semibold mb-3">Your Location</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input 
              ref={inputRef}
              className="w-full pl-10"
              placeholder="Enter workplace address or postcode"
              defaultValue={location.address}
            />
          </div>
        </CardContent>
        <div 
          ref={mapContainerRef} 
          className="h-48 bg-gray-100 relative"
          style={{ backgroundImage: 'url("https://maps.googleapis.com/maps/api/staticmap?center=51.505,-0.09&zoom=13&size=600x200&key=YOUR_API_KEY")' }}
        >
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Button variant="default" className="bg-white text-gray-800 hover:bg-gray-100">
              <MapPin className="mr-2 h-4 w-4 text-primary" />
              Choose on map
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
