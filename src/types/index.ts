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

export interface DailySchedule {
  available: boolean;
  start?: string; // HH:mm format, optional if not available
  end?: string; // HH:mm format, optional if not available
}

export interface BarberSettings {
  rentAmount: number;
  monday: DailySchedule;
  tuesday: DailySchedule;
  wednesday: DailySchedule;
  thursday: DailySchedule;
  friday: DailySchedule;
  saturday: DailySchedule;
  sunday: DailySchedule;
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

