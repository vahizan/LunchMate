import { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGooglePlaces } from "@/hooks/use-google-places";
import { Location } from "@/types";

interface LocationInputFieldProps {
  onLocationSelected?: (location: Location) => void;
}

export function LocationInputField({ onLocationSelected }: LocationInputFieldProps) {
  const { location, setLocation } = useContext(AppContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const { initAutocomplete, isLoaded, error } = useGooglePlaces();
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    console.log('LocationInputField: Autocomplete useEffect triggered');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // Clear any previous errors
    setAutocompleteError(null);
    
    if (!apiKey) {
      console.error('LocationInputField: Google Maps API key is missing');
      setAutocompleteError('Google Maps API key is missing. Please check your environment configuration.');
      return;
    }

    if (!isLoaded) {
      console.log('LocationInputField: Google Maps API not loaded yet, waiting...');
      return;
    }
    
    if (error) {
      console.error('LocationInputField: Google Maps API loading error:', error);
      setAutocompleteError(`Failed to load Google Maps: ${error.message}`);
      return;
    }

    if (inputRef.current) {
      console.log('LocationInputField: Input ref is available, initializing autocomplete');
      try {
        const autocomplete = initAutocomplete(inputRef.current, (place) => {
          console.log('LocationInputField: Place selected:', place);
          if (place.geometry?.location) {
            const newLocation = {
              address: place.formatted_address || place.name || "",
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            
            console.log('LocationInputField: Setting location with coordinates:', {
              lat: newLocation.lat,
              lng: newLocation.lng
            });
            
            setLocation(newLocation);
            
            if (onLocationSelected) {
              onLocationSelected(newLocation);
            }
          } else {
            console.warn('LocationInputField: Selected place has no geometry data');
          }
        });
        
        console.log('LocationInputField: Autocomplete initialization result:', !!autocomplete);
        
        if (!autocomplete) {
          setAutocompleteError('Failed to initialize location autocomplete. Please try again later.');
        }
      } catch (err) {
        console.error('LocationInputField: Error initializing autocomplete:', err);
        setAutocompleteError(`Error initializing autocomplete: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      console.warn('LocationInputField: Input ref is not available');
      setAutocompleteError('Input field not available. Please try again later.');
    }
  }, [initAutocomplete, setLocation, isLoaded, error, onLocationSelected]);

  return (
    <>
      {autocompleteError && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {autocompleteError}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
        <Input
          ref={inputRef}
          className="w-full pl-10"
          placeholder="Enter workplace address or postcode"
          defaultValue={location.address}
        />
      </div>
    </>
  );
}