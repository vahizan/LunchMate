import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { usePlaces } from "@/hooks/use-places";
import { Location } from "@/types";

interface LocationMapProps {
  location?: Location;
}

export const LocationMap = ({ location }: LocationMapProps) => {
  const { location: savedLocation } = useAppContext();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { showMap, providerType } = usePlaces();
  const [mapLocation, setMapLocation] = useState(!!location ? location : savedLocation);

  // Initialize map with location
  useEffect(()=> {
      if(!mapLocation){
        setMapLocation(savedLocation)
      }
  }, [savedLocation]);

  useEffect(() => {
    if(mapContainerRef.current && mapLocation){
      showMap(mapContainerRef?.current, {
            lat: mapLocation?.lat,
            lng: mapLocation?.lng
      });
    }
  
  }, [mapLocation, showMap]);

  return (
    <div
      id="map"
      ref={mapContainerRef}
      className="h-48 bg-gray-100 relative"
      data-testid="map-container"
    />
  );
}


export default LocationMap;