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
    console.log('LocationInput: Autocomplete useEffect triggered');
    
    if (inputRef.current) {
      console.log('LocationInput: Input ref is available, initializing autocomplete');
      const autocomplete = initAutocomplete(inputRef.current, (place) => {
        console.log('LocationInput: Place selected:', place);
        if (place.geometry?.location) {
          console.log('LocationInput: Setting location with coordinates:', {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
          setLocation({
            address: place.formatted_address || place.name || "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        } else {
          console.warn('LocationInput: Selected place has no geometry data');
        }
      });
      
      console.log('LocationInput: Autocomplete initialization result:', !!autocomplete);
    } else {
      console.warn('LocationInput: Input ref is not available');
    }
  }, [initAutocomplete, setLocation]);

  // Initialize map with default location if user has preferences
  useEffect(() => {
    console.log('LocationInput: Map useEffect triggered, userPreferences:', userPreferences);
    
    if (mapContainerRef.current && userPreferences?.defaultLocation) {
      console.log('LocationInput: Showing map with default location:', userPreferences.defaultLocation);
      const map = showMap(mapContainerRef.current, {
        lat: userPreferences.defaultLocation.lat || 0,
        lng: userPreferences.defaultLocation.lng || 0
      });
      console.log('LocationInput: Map initialization result:', !!map);
    } else {
      console.log('LocationInput: Map container ref or default location not available');
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

      {/* <gmpx-api-loader key="YOUR_API_KEY_HERE" solution-channel="GMP_GE_placepicker_v2">
       </gmpx-api-loader>
      <div id="place-picker-box">
        <div id="place-picker-container">
          <gmpx-place-picker placeholder="Enter an address"></gmpx-place-picker>
        </div>
      </div> */}
          </div>
        </CardContent>
        <div
          ref={mapContainerRef}
          className="h-48 bg-gray-100 relative"
          style={{ backgroundImage: `url("https://maps.googleapis.com/maps/api/staticmap?center=51.505,-0.09&zoom=13&size=600x200&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}")` }}
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
