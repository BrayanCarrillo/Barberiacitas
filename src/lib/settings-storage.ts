"use client";

import type { BarberSettings, Announcement } from '@/types';

const BARBER_SETTINGS_STORAGE_KEY_PREFIX = 'barberEaseBarberSettings_';

// Default announcement
export const defaultAnnouncement: Announcement = {
  id: 'default-announcement',
  message: '',
  isActive: false,
  affectsBooking: 'none',
  effectiveDate: undefined,
  customStartTime: undefined,
  customEndTime: undefined,
};

// Default settings if none are found in storage
export const defaultSettings: BarberSettings = {
    rentAmount: 100000, // Default rent in COP
    monday: { available: true, start: '09:00', end: '18:00' },
    tuesday: { available: true, start: '09:00', end: '18:00' },
    wednesday: { available: true, start: '09:00', end: '18:00' },
    thursday: { available: true, start: '09:00', end: '18:00' },
    friday: { available: true, start: '09:00', end: '20:00' },
    saturday: { available: true, start: '08:00', end: '20:00' },
    sunday: { available: false },
    breakTimes: [{ start: '11:00', end: '11:15' }],
    lunchBreak: { start: '13:00', end: '14:00' },
    announcement: { ...defaultAnnouncement }, // Include default announcement
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
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn("Cannot get settings: Local storage is not available. Returning default settings.");
    return JSON.parse(JSON.stringify(defaultSettings));
  }

  const storageKey = getStorageKey(barberId);
  console.log("getBarberSettings: Attempting to load from key:", storageKey);

  try {
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      const parsedData = JSON.parse(storedData) as Partial<BarberSettings>; // Use Partial for merging
      console.log("getBarberSettings: Found stored data:", parsedData);

      // Merge parsed data with defaults to ensure all fields are present
      const mergedSettings: BarberSettings = {
        ...defaultSettings, // Start with defaults
        ...parsedData,      // Override with stored values
        // Deep merge for announcement if it exists in parsedData, otherwise use default
        announcement: parsedData.announcement
          ? { ...defaultAnnouncement, ...parsedData.announcement }
          : { ...defaultAnnouncement },
      };

      // Basic validation (can be expanded)
      if (
        typeof mergedSettings.rentAmount === 'number' &&
        mergedSettings.monday && mergedSettings.tuesday && mergedSettings.wednesday &&
        mergedSettings.thursday && mergedSettings.friday && mergedSettings.saturday &&
        mergedSettings.sunday &&
        mergedSettings.lunchBreak && Array.isArray(mergedSettings.breakTimes) &&
        mergedSettings.announcement // Check if announcement exists
      ) {
        console.log("getBarberSettings: Merged and validated settings:", mergedSettings);
        return mergedSettings;
      } else {
        console.warn("getBarberSettings: Invalid or incomplete settings data after merge. Returning default settings and saving them.");
        saveBarberSettingsToStorage(barberId, defaultSettings); // Save defaults if current is invalid
        return JSON.parse(JSON.stringify(defaultSettings));
      }
    } else {
      console.log("getBarberSettings: No settings found. Returning default settings and saving them.");
      saveBarberSettingsToStorage(barberId, defaultSettings);
      return JSON.parse(JSON.stringify(defaultSettings));
    }
  } catch (error) {
    console.error("getBarberSettings: Error retrieving/parsing settings:", error);
    // Attempt to save defaults if parsing failed critically
    saveBarberSettingsToStorage(barberId, defaultSettings);
    return JSON.parse(JSON.stringify(defaultSettings));
  }
}

/**
 * Saves barber settings to local storage.
 * @param barberId - The ID of the barber.
 * @param settings - The settings object to save.
 * @returns True if saving was successful, false otherwise.
 */
export function saveBarberSettingsToStorage(barberId: string, settings: BarberSettings): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn("Cannot save settings: Local storage is not available.");
    return false;
  }

  const storageKey = getStorageKey(barberId);
  console.log("saveBarberSettings: Attempting to save to key:", storageKey, "with data:", settings);

  try {
    if (
      !settings ||
      typeof settings.rentAmount !== 'number' ||
      !settings.monday || !settings.tuesday || !settings.wednesday ||
      !settings.thursday || !settings.friday || !settings.saturday ||
      !settings.sunday ||
      !settings.lunchBreak || !Array.isArray(settings.breakTimes) ||
      !settings.announcement // Ensure announcement is part of validation
    ) {
      console.error("saveBarberSettings: Attempted to save invalid settings object:", settings);
      return false;
    }
    const dataToStore = JSON.stringify(settings);
    localStorage.setItem(storageKey, dataToStore);
    console.log("saveBarberSettings: Settings saved successfully.");
    window.dispatchEvent(new CustomEvent('barberSettingsChanged', { detail: { barberId, settings } }));
    return true;
  } catch (error) {
    console.error("saveBarberSettings: Error saving settings:", error);
    return false;
  }
}
