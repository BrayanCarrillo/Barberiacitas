
import { format } from 'date-fns';

/**
 * Formats a Date object into a string (e.g., "July 4, 2024").
 * @param date The Date object to format.
 * @returns The formatted date string.
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return format(date, 'PPP'); // e.g., Jul 4th, 2024
}

/**
 * Formats a time string (e.g., "14:30") into a more readable format (e.g., "2:30 PM").
 * @param timeString The time string in HH:mm format.
 * @returns The formatted time string.
 */
export function formatTime(timeString: string): string {
  if (!timeString) return '';
  // Create a date object just to use the format function's 'p' token
  const date = new Date(`1970-01-01T${timeString}`);
  // Check if the created date is valid
  if (isNaN(date.getTime())) {
      console.warn(`Invalid time string provided to formatTime: ${timeString}`);
      return timeString; // Return original string if invalid
  }
  return format(date, 'p'); // e.g., 2:30 PM
}


/**
 * Checks if two Date objects represent the same day.
 * @param date1 The first Date object.
 * @param date2 The second Date object.
 * @returns True if they are the same day, false otherwise.
 */
export function isSameDay(date1: Date | null | undefined, date2: Date | null | undefined): boolean {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
