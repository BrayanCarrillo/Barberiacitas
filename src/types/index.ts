export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
}

export interface Appointment {
  id: string;
  clientName?: string; // Optional for client-side, required for barber
  service: Service;
  date: Date;
  time: string; // e.g., "10:00 AM"
}

export interface BarberSettings {
  workHours: { start: string; end: string };
  breakTimes: { start: string; end: string }[];
  lunchBreak: { start: string; end: string };
}

// Ensure Payment interface aligns with rent-payment service
export type { Payment } from '@/services/rent-payment';

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AvailableSlots {
  [date: string]: TimeSlot[];
}
