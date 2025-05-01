"use client";

import type { Appointment } from '@/types';

const STORAGE_KEY = 'barberEaseClientAppointments';

// Helper to parse appointment data and revive Date objects
function parseAppointment(appData: Omit<Appointment, 'date'> & { date: string }): Appointment | null {
   try {
    const date = new Date(appData.date);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date found in stored appointment:", appData);
      return null; // Skip invalid date entry
    }
    return {
      ...appData,
      date: date,
    };
  } catch (error) {
     console.error("Error parsing stored appointment:", error, appData);
     return null;
  }
}

export function getClientAppointments(): Appointment[] {
  // Check if running on the client side
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return []; // Return empty array during SSR or if localStorage is unavailable
  }
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData) as (Omit<Appointment, 'date'> & { date: string })[];
       // Parse each appointment and filter out null values (invalid entries)
       return parsedData.map(parseAppointment).filter((app): app is Appointment => app !== null);
    }
    return [];
  } catch (error) {
    console.error("Error retrieving appointments from local storage:", error);
    return [];
  }
}

export function addClientAppointment(appointment: Appointment): void {
  // Check if running on the client side
   if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.warn("Cannot add appointment: Local storage is not available.");
    return;
  }
  try {
    const existingAppointments = getClientAppointments();
    // Convert Date object back to ISO string for storage
    // Ensure clientName is included, even if undefined initially (though schema requires it now)
    const appointmentToStore = {
        ...appointment,
        clientName: appointment.clientName ?? 'Unknown Client', // Fallback just in case
        date: appointment.date.toISOString(),
    };
    const updatedAppointments = [...existingAppointments, appointmentToStore];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAppointments));
  } catch (error) {
    console.error("Error adding appointment to local storage:", error);
     // Optionally throw error or show user feedback
     throw new Error("Failed to save appointment.");
  }
}

export function removeClientAppointment(appointmentId: string): void {
   // Check if running on the client side
   if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
     console.warn("Cannot remove appointment: Local storage is not available.");
     return;
  }
  try {
    const existingAppointments = getClientAppointments();
    const updatedAppointments = existingAppointments.filter(app => app.id !== appointmentId);
     // Convert Date objects back to ISO strings before storing again
     const appointmentsToStore = updatedAppointments.map(app => ({
        ...app,
        clientName: app.clientName, // Keep the clientName
        date: app.date.toISOString(),
     }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointmentsToStore));
  } catch (error) {
     console.error("Error removing appointment from local storage:", error);
     // Optionally throw error or show user feedback
      throw new Error("Failed to cancel appointment.");
  }
}