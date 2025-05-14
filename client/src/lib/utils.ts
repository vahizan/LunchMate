import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Filters, Location } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compares two filter objects and returns true if they contain the same values
 * @param filters1 First filter object
 * @param filters2 Second filter object
 * @returns boolean indicating if the filters are equal
 */
export function areFiltersEqual(filters1: Filters | undefined, filters2: Filters | undefined): boolean {
  // If both are undefined, they're equal
  if (!filters1 && !filters2) return true;
  
  // If only one is undefined, they're not equal
  if (!filters1 || !filters2) return false;
  
  // Compare primitive properties
  if (
    filters1.priceLevel !== filters2.priceLevel ||
    filters1.historyDays !== filters2.historyDays ||
    filters1.excludeChains !== filters2.excludeChains ||
    filters1.excludeCafe !== filters2.excludeCafe
  ) {
    return false;
  }
  
  // Compare radius array
  if (filters1.radius.length !== filters2.radius.length) return false;
  for (let i = 0; i < filters1.radius.length; i++) {
    if (filters1.radius[i] !== filters2.radius[i]) return false;
  }
  
  // Compare cuisines array
  if (filters1.cuisines.length !== filters2.cuisines.length) return false;
  for (let i = 0; i < filters1.cuisines.length; i++) {
    if (filters1.cuisines[i] !== filters2.cuisines[i]) return false;
  }
  
  // Compare dietary array
  if (filters1.dietary.length !== filters2.dietary.length) return false;
  for (let i = 0; i < filters1.dietary.length; i++) {
    if (filters1.dietary[i] !== filters2.dietary[i]) return false;
  }
  
  // All checks passed, filters are equal
  return true;
}

/**
 * Compares two location objects and returns true if they contain the same values
 * @param location1 First location object
 * @param location2 Second location object
 * @returns boolean indicating if the locations are equal
 */
export function areLocationsEqual(location1: Location | undefined, location2: Location | undefined): boolean {
  // If both are undefined, they're equal
  if (!location1 && !location2) return true;
  
  // If only one is undefined, they're not equal
  if (!location1 || !location2) return false;
  
  // Compare all properties
  return (
    location1.address === location2.address &&
    location1.lat === location2.lat &&
    location1.lng === location2.lng
  );
}
