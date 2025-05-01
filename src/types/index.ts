export interface Service {
  id: string;
  type: 'service'; // Distinguish from combos/products if needed in combined lists
  name: string;
  duration: number; // minutes
  price: number;
}

export interface Product {
    id: string;
    type: 'product';
    name: string;
    price: number;
    description?: string; // Optional description
}

export interface Combo {
    id: string;
    type: 'combo';
    name: string;
    serviceIds: string[]; // IDs of the services included in the combo
    price: number; // Custom price for the combo
    // Duration will be calculated based on included services
}

// Represents items that can be booked by a client
export type BookableItem = Service | Combo;

export interface Appointment {
  id: string;
  clientName: string; // Make clientName mandatory
  // Service can now be a Service or a Combo
  // We store the core details at booking time in case the original service/combo changes later
  bookedItem: {
      id: string;
      type: 'service' | 'combo';
      name: string;
      duration: number;
      price: number;
  };
  date: Date;
  time: string; // e.g., "10:00" (HH:mm)
  status?: 'completed' | 'cancelled' | 'noShow';
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
