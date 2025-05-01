export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
}

export interface Appointment {
  id: string;
  clientName: string; // Make clientName mandatory
  service: Service;
  date: Date;
  time: string; // e.g., "10:00" (HH:mm)
}

export interface BarberSettings {
  workHours: { start: string; end: string }; // HH:mm format
  breakTimes: { start: string; end: string }[]; // HH:mm format
  lunchBreak: { start: string; end: string }; // HH:mm format
}

// Ensure Payment interface aligns with rent-payment service
export type { Payment } from '@/services/rent-payment';

export interface TimeSlot {
  time: string; // HH:mm format
  available: boolean;
}

export interface AvailableSlots {
  [date: string]: TimeSlot[];
}
