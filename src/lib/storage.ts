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
     // Basic validation for bookedItem structure
     if (!appData.bookedItem || typeof appData.bookedItem.id !== 'string' || typeof appData.bookedItem.name !== 'string' || typeof appData.bookedItem.duration !== 'number' || typeof appData.bookedItem.price !== 'number') {
          console.warn("Invalid bookedItem structure in stored appointment:", appData);
          return null; // Skip invalid entry
     }

    return {
      ...appData,
      date: date,
      status: appData.status || 'completed',
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
     // Validate bookedItem before saving
     if (!appointment.bookedItem || typeof appointment.bookedItem.id !== 'string' || typeof appointment.bookedItem.name !== 'string' || typeof appointment.bookedItem.duration !== 'number' || typeof appointment.bookedItem.price !== 'number') {
          console.error("Attempted to save appointment with invalid bookedItem:", appointment);
          throw new Error("Invalid appointment data: Missing or invalid booked item details.");
     }

    const existingAppointments = getClientAppointments();
    // Convert Date object back to ISO string for storage
    const appointmentToStore = {
        ...appointment,
        clientName: appointment.clientName ?? 'Unknown Client', // Fallback just in case
        date: appointment.date.toISOString(),
        // Ensure bookedItem is correctly structured
         bookedItem: {
            id: appointment.bookedItem.id,
            type: appointment.bookedItem.type,
            name: appointment.bookedItem.name,
            duration: appointment.bookedItem.duration,
            price: appointment.bookedItem.price,
        },
        status: appointment.status || 'completed',
    };
    const updatedAppointments = [...existingAppointments, appointmentToStore];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAppointments));
  } catch (error) {
    console.error("Error adding appointment to local storage:", error);
     // Re-throw or handle as appropriate
     throw error instanceof Error ? error : new Error("Failed to save appointment.");
  }
}

export function saveClientAppointments(appointments: Appointment[]): void {
   // Check if running on the client side
   if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.warn("Cannot save appointments: Local storage is not available.");
      return;
   }

   try {
      // Convert Date objects back to ISO strings before storing again
      const appointmentsToStore = appointments.map(app => ({
         ...app,
         clientName: app.clientName, // Keep the clientName
         date: app.date.toISOString(),
         // Ensure bookedItem is stored correctly
          bookedItem: {
             id: app.bookedItem.id,
             type: app.bookedItem.type,
             name: app.bookedItem.name,
             duration: app.bookedItem.duration,
             price: app.bookedItem.price,
         },
         status: app.status || 'completed',
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appointmentsToStore));
   } catch (error) {
      console.error("Error saving appointments to local storage:", error);
      throw new Error("Failed to save appointments.");
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
        // Ensure bookedItem is stored correctly
         bookedItem: {
            id: app.bookedItem.id,
            type: app.bookedItem.type,
            name: app.bookedItem.name,
            duration: app.bookedItem.duration,
            price: app.bookedItem.price,
        },
        status: app.status || 'completed',
     }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointmentsToStore));
  } catch (error) {
     console.error("Error removing appointment from local storage:", error);
      throw new Error("Failed to cancel appointment.");
  }
}
