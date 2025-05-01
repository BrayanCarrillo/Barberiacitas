"use client";

import type { BarberSettings } from '@/types';

const BARBER_SETTINGS_STORAGE_KEY_PREFIX = 'barberEaseBarberSettings_';

// Default settings if none are found in storage
const defaultSettings: BarberSettings = {
  workHours: { start: '09:00', end: '17:00' },
  breakTimes: [{ start: '11:00', end: '11:15' }],
  lunchBreak: { start: '12:30', end: '13:00' },
};

function getStorageKey(barberId: string): string {
  return `${BARBER_SETTINGS_STORAGE_KEY_PREFIX}${barberId}`;
}

/**
 * Retrieves barber settings from local storage.
 * Returns default settings if none are found or if there's an error.
 * @param barberId - The ID of the barber.
 * @returns The barber's settings.
 */
export function getBarberSettingsFromStorage(barberId: string): BarberSettings {
  // Check if running on the client side
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn("Cannot get settings: Local storage is not available. Returning default settings.");
    return { ...defaultSettings }; // Return a copy
  }

  const storageKey = getStorageKey(barberId);

  try {
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      const parsedData = JSON.parse(storedData) as BarberSettings;
      // Basic validation (can be expanded)
      if (parsedData && parsedData.workHours && parsedData.lunchBreak && Array.isArray(parsedData.breakTimes)) {
          return parsedData;
      } else {
          console.warn("Invalid settings data found in storage for key:", storageKey, ". Returning default settings.");
          // Optionally save default settings back to storage here
          // saveBarberSettingsToStorage(barberId, defaultSettings);
          return { ...defaultSettings };
      }
    } else {
      // No settings found, return default and potentially save them
      console.log("No settings found for key:", storageKey, ". Returning default settings.");
       // Optionally save default settings back to storage here
       // saveBarberSettingsToStorage(barberId, defaultSettings);
      return { ...defaultSettings };
    }
  } catch (error) {
    console.error("Error retrieving settings from local storage for key:", storageKey, error);
    return { ...defaultSettings }; // Return default settings on error
  }
}

/**
 * Saves barber settings to local storage.
 * @param barberId - The ID of the barber.
 * @param settings - The settings object to save.
 * @returns True if saving was successful, false otherwise.
 */
export function saveBarberSettingsToStorage(barberId: string, settings: BarberSettings): boolean {
  // Check if running on the client side
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn("Cannot save settings: Local storage is not available.");
    return false;
  }

  const storageKey = getStorageKey(barberId);

  try {
    // Basic validation before saving (can be expanded)
     if (!settings || !settings.workHours || !settings.lunchBreak || !Array.isArray(settings.breakTimes)) {
        console.error("Attempted to save invalid settings object for key:", storageKey, settings);
        return false;
     }
    const dataToStore = JSON.stringify(settings);
    localStorage.setItem(storageKey, dataToStore);
    console.log("Settings saved successfully for key:", storageKey);
     // Optional: Dispatch an event if other components need to react to settings changes
     // window.dispatchEvent(new CustomEvent('barberSettingsChanged', { detail: { barberId } }));
    return true;
  } catch (error) {
    console.error("Error saving settings to local storage for key:", storageKey, error);
    return false;
  }
}