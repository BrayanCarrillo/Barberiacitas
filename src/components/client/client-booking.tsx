"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { addDays, format, isBefore, startOfDay } from 'date-fns'; // Added startOfDay
import { CalendarIcon, Clock, Scissors, User } from 'lucide-react'; // Added User icon
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input'; // Added Input import
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addClientAppointment } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { formatDate, formatTime } from '@/lib/date-utils';
import type { Service, Appointment, TimeSlot } from '@/types';

// Mock services data (replace with API call in a real app)
const services: Service[] = [
  { id: 'haircut', name: 'Haircut', duration: 30, price: 25 },
  { id: 'beard_trim', name: 'Beard Trim', duration: 20, price: 15 },
  { id: 'haircut_beard', name: 'Haircut & Beard Trim', duration: 50, price: 35 },
  { id: 'shave', name: 'Hot Towel Shave', duration: 40, price: 30 },
];

// Mock function to get available slots (replace with actual API call)
async function getAvailableSlotsForDate(date: Date, serviceDuration: number): Promise<TimeSlot[]> {
   console.log(`Fetching slots for ${format(date, 'yyyy-MM-dd')} with duration ${serviceDuration}min`);
   // Simulate API delay
   await new Promise(resolve => setTimeout(resolve, 500));

    const slots: TimeSlot[] = [];
    const startHour = 9; // Barber starts at 9 AM
    const endHour = 17; // Barber ends at 5 PM
    const lunchStartHour = 12;
    const lunchEndHour = 13;
    const intervalMinutes = 15; // Check availability every 15 minutes
    const now = new Date(); // Get current time to disable past slots for today

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
            const slotTime = new Date(date);
            slotTime.setHours(hour, minute, 0, 0);

            // Skip if slot is during lunch break
            if (hour >= lunchStartHour && hour < lunchEndHour) continue;

            // Skip if slot ends after work hours (considering service duration)
            const endTime = new Date(slotTime.getTime() + serviceDuration * 60000);
            if (endTime.getHours() > endHour || (endTime.getHours() === endHour && endTime.getMinutes() > 0)) continue; // Allow ending exactly at endHour

             // Check if end time falls into lunch
            if (endTime.getHours() >= lunchStartHour && endTime.getHours() < lunchEndHour && !(hour === lunchStartHour && minute === 0)) continue;

            // Simulate some unavailable slots randomly (e.g., existing appointments)
            let isAvailable = Math.random() > 0.3; // 70% chance of being available

            // Disable past time slots for the current day
            if (isBefore(slotTime, now)) {
                 isAvailable = false;
             }

            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push({ time: timeString, available: isAvailable });
        }
    }
    // Remove duplicates potentially caused by interval logic, favoring earlier availability status
    const uniqueSlots = Array.from(new Map(slots.map(slot => [slot.time, slot])).values());
    // Sort slots chronologically
    uniqueSlots.sort((a, b) => a.time.localeCompare(b.time));
    return uniqueSlots;
};


const bookingFormSchema = z.object({
  clientName: z.string().min(1, { message: 'Please enter your full name.' }), // Added client name
  serviceId: z.string({ required_error: 'Please select a service.' }),
  date: z.date({ required_error: 'Please select a date.' }),
  time: z.string({ required_error: 'Please select a time slot.' }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function ClientBooking() {
  const { toast } = useToast();
  // No longer need local selectedDate state, use form state directly
  const [availableSlots, setAvailableSlots] = React.useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false); // State to track client-side mount

   React.useEffect(() => {
    setIsClient(true); // Set to true once component mounts on client
  }, []);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: '', // Added default value
      serviceId: '',
      date: undefined,
      time: '',
    },
  });

  const selectedServiceId = form.watch('serviceId');
  const selectedDateWatcher = form.watch('date'); // Watch date from form state
  const selectedService = services.find(s => s.id === selectedServiceId);

  // Fetch available slots when date or service changes
  React.useEffect(() => {
     // Use selectedDateWatcher from form state
     if (selectedDateWatcher && selectedService && isClient) { // Ensure runs only on client
      setIsLoadingSlots(true);
      setAvailableSlots([]); // Clear previous slots immediately
      form.resetField('time'); // Reset time when date or service changes

      getAvailableSlotsForDate(selectedDateWatcher, selectedService.duration)
        .then(slots => {
             setAvailableSlots(slots);
        })
        .catch(error => {
             console.error("Failed to fetch available slots:", error);
             setAvailableSlots([]);
              toast({
                title: "Error Loading Slots",
                description: "Could not load available times for the selected date.",
                variant: "destructive",
            });
        })
         .finally(() => {
            setIsLoadingSlots(false); // Set loading false after fetch completes or fails
         });
    } else {
       setAvailableSlots([]); // Clear slots if date/service is not selected
       setIsLoadingSlots(false); // Ensure loading is false
    }
    // Add isClient to dependency array
  }, [selectedDateWatcher, selectedService, form, toast, isClient]);


  function onSubmit(data: BookingFormValues) {
     if (!isClient) return; // Ensure crypto is available

     if (!selectedService) {
      toast({
        title: "Error",
        description: "Selected service not found.",
        variant: "destructive",
      });
      return;
    }

    const newAppointment: Appointment = {
      id: crypto.randomUUID(), // Generate a unique ID - Safe now due to isClient check
      clientName: data.clientName, // Added client name
      service: selectedService,
      date: data.date,
      time: data.time,
    };

    try {
      addClientAppointment(newAppointment);
      toast({
        title: 'Appointment Booked!',
         // Use formatTime utility
        description: `${data.clientName}, your ${selectedService.name} is scheduled for ${formatDate(data.date)} at ${formatTime(data.time)}.`,
      });
      form.reset();
      // Resetting the form should clear the date, which clears slots via useEffect
      setAvailableSlots([]); // Explicitly clear slots as well
      // Trigger a custom event to notify other components like ClientAppointments
       window.dispatchEvent(new CustomEvent('appointmentbooked'));
       // Also trigger storage event for potentially listening tabs (though custom event is often better for same-page updates)
       window.dispatchEvent(new StorageEvent('storage', { key: 'barberEaseClientAppointments' }));

    } catch (error) {
       toast({
        title: "Booking Failed",
        description: "Could not save the appointment. Please try again.",
        variant: "destructive",
      });
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Your Visit</CardTitle>
        <CardDescription>Choose a service, date, and time.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-4">
             <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Enter your full name" className="pl-8" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <Scissors className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} (${service.price}) - {service.duration} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                           // Disable button until client side mount to prevent hydration issue with Popover state
                          disabled={!isClient}
                        >
                           {/* Use formatDate utility */}
                          {field.value ? (
                            formatDate(field.value)
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                     {/* PopoverContent might also cause hydration issues if open by default server-side.
                         Ensure it's closed initially or conditionally render based on isClient */}
                    {isClient && (
                       <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                          }}
                           disabled={(date) =>
                             isBefore(date, startOfDay(new Date())) // Disable past dates including today before start of day
                           }
                          initialFocus
                        />
                      </PopoverContent>
                     )}
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDateWatcher && selectedService && (
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Time Slots</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingSlots || !isClient || availableSlots.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                           <Clock className="mr-2 h-4 w-4" />
                           <SelectValue placeholder={isLoadingSlots ? "Loading slots..." : (availableSlots.length > 0 ? "Select a time" : "No slots available")} />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
                         {isLoadingSlots ? (
                            <div className="flex justify-center items-center p-4">
                              {/* Consider a more subtle loading indicator */}
                              <span className="text-muted-foreground text-sm">Loading...</span>
                             </div>
                         ) : availableSlots.filter(slot => slot.available).length > 0 ? (
                             availableSlots
                                .filter(slot => slot.available) // Filter only available slots for display
                                .map((slot) => (
                                  <SelectItem key={slot.time} value={slot.time}>
                                     {/* Use formatTime utility */}
                                    {formatTime(slot.time)}
                                  </SelectItem>
                                ))
                           ) : (
                             <div className="p-4 text-center text-sm text-muted-foreground">
                               No available slots for this date/service.
                             </div>
                           )}
                      </SelectContent>
                    </Select>
                    {selectedService && (
                        <FormDescription>
                        Slots shown are start times for your {selectedService.duration} minute service.
                        </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={!form.formState.isValid || isLoadingSlots || !isClient}>
              {isLoadingSlots ? 'Loading...' : 'Book Appointment'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}