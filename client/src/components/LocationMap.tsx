import { useContext, useEffect, useRef } from "react";
import { AppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useGooglePlaces } from "@/hooks/use-google-places";
import { Location } from "@/types";

interface LocationMapProps {
  location?: Location;
  onMapClick?: () => void;
}

export function LocationMap({ location, onMapClick }: LocationMapProps) {
  const { userPreferences } = useContext(AppContext);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { showMap } = useGooglePlaces();

  // Use provided location or default from user preferences
  const mapLocation = location || userPreferences?.defaultLocation;

  // Initialize map with location
  useEffect(() => {
    console.log('LocationMap: Map useEffect triggered, location:', mapLocation);
    
    if (mapContainerRef.current && mapLocation) {
      console.log('LocationMap: Showing map with location:', mapLocation);
      const map = showMap(mapContainerRef.current, {
        lat: mapLocation.lat || 0,
        lng: mapLocation.lng || 0
      });
      console.log('LocationMap: Map initialization result:', !!map);
    } else {
      console.log('LocationMap: Map container ref or location not available');
    }
  }, [mapLocation, showMap]);

  // Get API key for static map fallback
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Determine coordinates for static map fallback
  const lat = mapLocation?.lat || 0;
  const lng = mapLocation?.lng || 0;
  
  return (
    <div
      ref={mapContainerRef}
      className="h-48 bg-gray-100 relative"
      style={{ 
        backgroundImage: apiKey ? 
          `url("https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=13&size=600x200&key=${apiKey}")` : 
          undefined 
      }}
    >
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
        <Button 
          variant="default" 
          className="bg-white text-gray-800 hover:bg-gray-100"
          onClick={onMapClick}
        >
          <MapPin className="mr-2 h-4 w-4 text-primary" />
          Choose on map
        </Button>
      </div>
    </div>
  );
}