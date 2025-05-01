"use client";

import type { Appointment } from '@/types';

const STORAGE_KEY = 'barberEaseClientAppointments';

export function getClientAppointments(): Appointment[] {
  if (typeof window === 'undefined') {
    return []; // Return empty array during SSR or server-side execution
  }
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      // Need to revive Date objects after JSON parsing
      const parsedData = JSON.parse(storedData) as (Omit<Appointment, 'date'> & { date: string })[];
      return parsedData.map(app => ({
        ...app,
        date: new Date(app.date),
      }));
    }
    return [];
  } catch (error) {
    console.error("Error retrieving appointments from local storage:", error);
    return [];
  }
}

export function addClientAppointment(appointment: Appointment): void {
   if (typeof window === 'undefined') {
    console.warn("Cannot add appointment: window is not defined.");
    return;
  }
  try {
    const existingAppointments = getClientAppointments();
    const updatedAppointments = [...existingAppointments, appointment];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAppointments));
  } catch (error) {
    console.error("Error adding appointment to local storage:", error);
  }
}

export function removeClientAppointment(appointmentId: string): void {
   if (typeof window === 'undefined') {
     console.warn("Cannot remove appointment: window is not defined.");
     return;
  }
  try {
    const existingAppointments = getClientAppointments();
    const updatedAppointments = existingAppointments.filter(app => app.id !== appointmentId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAppointments));
  } catch (error) {
     console.error("Error removing appointment from local storage:", error);
  }
}
