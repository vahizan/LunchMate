import { useContext, useEffect, useRef, useState } from "react";
import { AppContext, useAppContext } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePlaces } from "@/hooks/use-places";
import { Location } from "@/types";

interface LocationInputFieldProps {
  onLocationSelected?: (location: Location) => void;
}

export function LocationInputField({ onLocationSelected }: LocationInputFieldProps) {
  const { location, setLocation } = useAppContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const { initAutocomplete, isLoaded, error, providerType } = usePlaces();
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    console.log(`LocationInputField: Autocomplete useEffect triggered (using ${providerType} provider)`);
    
    // Determine which API key to use based on provider
    let apiKey;
    let effectiveProvider = providerType;
    
    // For hybrid provider, we use Foursquare for autocomplete
    if (providerType === 'hybrid') {
      apiKey = import.meta.env.VITE_FOURSQUARE_PLACES_API_KEY;
      // Use a string for logging purposes only, not for type assignment
      const providerForLogging = 'foursquare (via hybrid)';
      console.log(`Using ${providerForLogging} for autocomplete`);
    } else if (providerType === 'google') {
      apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    } else {
      apiKey = import.meta.env.VITE_FOURSQUARE_PLACES_API_KEY;
    }
    
    // Clear any previous errors
    setAutocompleteError(null);
    
    if (!apiKey) {
      console.error(`LocationInputField: ${providerType} API key is missing`);
      setAutocompleteError(`${providerType.charAt(0).toUpperCase() + providerType.slice(1)} API key is missing. Please check your environment configuration.`);
      return;
    }

    if (!isLoaded) {
      console.log(`LocationInputField: ${providerType} API not loaded yet, waiting...`);
      return;
    }
    
    if (error) {
      console.error(`LocationInputField: ${providerType} API loading error:`, error);
      setAutocompleteError(`Failed to load ${providerType} API: ${error.message}`);
      return;
    }

    if (inputRef.current) {
      console.log(`LocationInputField: Input ref is available, initializing ${providerType} autocomplete`);
      try {
        const autocomplete = initAutocomplete(inputRef.current, (place) => {
          console.log('LocationInputField: Place selected:', place);
          if (place.geometry?.location) {
            // Extract coordinates and ensure they're numbers
            const lat = Number(place.geometry.location.lat());
            const lng = Number(place.geometry.location.lng());
            
            const newLocation = {
              address: place.formatted_address || place.name || "",
              lat: lat,
              lng: lng,
            };
            
            // Only log in development
            if (import.meta.env.DEV) {
              console.log('LocationInputField: Setting location with coordinates:', {
                lat: newLocation.lat,
                lng: newLocation.lng,
                latType: typeof newLocation.lat,
                lngType: typeof newLocation.lng
              });
              
              // Check for zero values
              if (newLocation.lat === 0 || newLocation.lng === 0) {
                console.log("LocationInputField: Location has 0 values (this is valid):", newLocation);
              }
              
              console.log("LocationInputField - Setting location with new object:", newLocation);
            }
            
            // Create a new object to ensure reference changes
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
  }, [initAutocomplete, setLocation, isLoaded, error, onLocationSelected, providerType]);

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
          defaultValue={location?.address}
        />
      </div>
    </>
  );
}