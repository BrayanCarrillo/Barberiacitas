
"use client";

import type { Appointment } from '@/types';

const STORAGE_KEY = 'barberEaseClientAppointments';

export function getClientAppointments(): Appointment[] {
  // Check if running on the client side
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return []; // Return empty array during SSR or if localStorage is unavailable
  }
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      // Need to revive Date objects after JSON parsing
      const parsedData = JSON.parse(storedData) as (Omit<Appointment, 'date'> & { date: string })[];
      return parsedData.map(app => ({
        ...app,
         // Ensure date parsing is robust
        date: new Date(app.date),
      })).filter(app => !isNaN(app.date.getTime())); // Filter out invalid dates
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
    const appointmentToStore = {
        ...appointment,
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
        date: app.date.toISOString(),
     }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointmentsToStore));
  } catch (error) {
     console.error("Error removing appointment from local storage:", error);
     // Optionally throw error or show user feedback
      throw new Error("Failed to cancel appointment.");
  }
}
