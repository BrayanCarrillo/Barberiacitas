"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, isBefore, startOfDay, isSameDay as isSameDate } from 'date-fns'; // Added startOfDay and renamed isSameDay
import { CalendarIcon, Clock, Scissors, User } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
import { formatDate, formatTime, isSameDay } from '@/lib/date-utils'; // Use isSameDay from date-utils
import type { Service, Appointment, TimeSlot } from '@/types';
import { Skeleton } from '../ui/skeleton';


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
   await new Promise(resolve => setTimeout(resolve, 300)); // Reduced delay slightly

    const slots: TimeSlot[] = [];
    const startHour = 9; // Barber starts at 9 AM
    const endHour = 17; // Barber ends at 5 PM
    const lunchStartHour = 12;
    const lunchEndHour = 13;
    const intervalMinutes = 15; // Check availability every 15 minutes
    const now = new Date(); // Get current time to disable past slots for today

    const selectedDayStart = startOfDay(date); // Get the start of the selected day for comparison

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
            const slotTime = new Date(selectedDayStart); // Start with the beginning of the selected day
            slotTime.setHours(hour, minute, 0, 0); // Set the specific hour and minute

            // Skip if slot is during lunch break
            if (hour >= lunchStartHour && hour < lunchEndHour) continue;

            // Skip if slot ends after work hours (considering service duration)
            const endTime = new Date(slotTime.getTime() + serviceDuration * 60000);
            if (endTime.getHours() > endHour || (endTime.getHours() === endHour && endTime.getMinutes() > 0)) continue; // Allow ending exactly at endHour

             // Check if end time falls into lunch
            if (endTime.getHours() >= lunchStartHour && endTime.getHours() < lunchEndHour && !(hour === lunchStartHour && minute === 0)) continue;

            // Simulate some unavailable slots randomly (e.g., existing appointments)
            let isAvailable = Math.random() > 0.3; // 70% chance of being available

            // Disable past time slots ONLY for the current day
            // Use isSameDay utility for robust comparison
            if (isSameDay(selectedDayStart, startOfDay(now)) && isBefore(slotTime, now)) {
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
    console.log(`Generated ${uniqueSlots.length} slots for ${format(date, 'yyyy-MM-dd')}`);
    return uniqueSlots;
};


const bookingFormSchema = z.object({
  clientName: z.string().min(2, { message: 'Please enter your full name (minimum 2 characters).' }).max(50, { message: 'Name cannot exceed 50 characters.'}), // Added client name validation
  serviceId: z.string({ required_error: 'Please select a service.' }).min(1, { message: 'Please select a service.' }), // Ensure non-empty string
  date: z.date({ required_error: 'Please select a date.' }),
  time: z.string({ required_error: 'Please select a time slot.' }).min(1, { message: 'Please select a time slot.' }), // Ensure non-empty string
});


type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function ClientBooking() {
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = React.useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
  const [calendarOpen, setCalendarOpen] = React.useState(false); // State for calendar popover

   React.useEffect(() => {
    setIsClient(true); // Set to true once component mounts on client
  }, []);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: '',
      serviceId: '',
      date: undefined,
      time: '',
    },
     mode: "onChange", // Validate on change for better UX
  });

  const selectedServiceId = form.watch('serviceId');
  const selectedDateWatcher = form.watch('date'); // Watch date from form state
  const selectedService = services.find(s => s.id === selectedServiceId);

  // Fetch available slots when date or service changes
  React.useEffect(() => {
     if (selectedDateWatcher && selectedService && isClient) { // Ensure runs only on client
      setIsLoadingSlots(true);
      setAvailableSlots([]); // Clear previous slots immediately
      form.resetField('time', { defaultValue: '' }); // Reset time when date or service changes

      // Use a timeout to allow UI to update before potentially long fetch
       const timerId = setTimeout(() => {
           getAvailableSlotsForDate(selectedDateWatcher, selectedService.duration)
            .then(slots => {
                console.log("Received slots:", slots);
                setAvailableSlots(slots);
                // Check if any slots are available
                 const hasAvailableSlots = slots.some(slot => slot.available);
                 if (!hasAvailableSlots) {
                   toast({
                    title: "No Slots Available",
                    description: `No time slots are currently available for ${formatDate(selectedDateWatcher)}. Please try another date.`,
                    variant: "default", // Use default variant, not destructive
                    duration: 5000,
                   });
                 }
            })
            .catch(error => {
                console.error("Failed to fetch available slots:", error);
                setAvailableSlots([]);
                toast({
                    title: "Error Loading Slots",
                    description: "Could not load available times. Please try again.",
                    variant: "destructive",
                });
            })
            .finally(() => {
                setIsLoadingSlots(false); // Set loading false after fetch completes or fails
            });
       }, 100); // Small delay

       return () => clearTimeout(timerId); // Cleanup timeout if dependencies change quickly

    } else {
       setAvailableSlots([]); // Clear slots if date/service is not selected
       // Don't set loading if date/service not selected
       if (isLoadingSlots) setIsLoadingSlots(false);
    }
  }, [selectedDateWatcher, selectedService, form.resetField, toast, isClient]); // Removed form from deps, added resetField


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

     // Additional check to ensure date and time are valid before submission
     if (!data.date || !data.time) {
        toast({
            title: "Incomplete Information",
            description: "Please ensure you have selected a valid date and time slot.",
            variant: "destructive",
        });
        return;
     }


    const newAppointment: Appointment = {
      id: crypto.randomUUID(), // Generate a unique ID - Safe now due to isClient check
      clientName: data.clientName.trim(), // Trim whitespace from name
      service: selectedService,
      date: data.date,
      time: data.time,
    };

    try {
      addClientAppointment(newAppointment);
      toast({
        title: 'Appointment Booked!',
        description: `${newAppointment.clientName}, your ${selectedService.name} is scheduled for ${formatDate(data.date)} at ${formatTime(data.time)}.`,
      });
      form.reset(); // Reset the entire form
      setAvailableSlots([]); // Explicitly clear slots as well
      // Trigger events to notify other components
       window.dispatchEvent(new CustomEvent('appointmentbooked'));
       window.dispatchEvent(new StorageEvent('storage', { key: 'barberEaseClientAppointments' }));

    } catch (error) {
       console.error("Booking submission error:", error); // Log the actual error
       toast({
        title: "Booking Failed",
        description: "Could not save the appointment. Please try again or contact support.",
        variant: "destructive",
      });
    }
  }


   const renderSlotSkeleton = (count = 5) => (
     <div className="space-y-2">
       <Skeleton className="h-9 w-full rounded-md" />
       {Array.from({ length: count - 1 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md opacity-75" />
        ))}
     </div>
    );


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
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={!isClient} // Disable until client side mount
                        >
                          {field.value ? (
                            formatDate(field.value) // Use formatDate utility
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    {isClient && ( // Conditionally render PopoverContent
                       <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setCalendarOpen(false); // Close popover on date select
                          }}
                           disabled={(date) =>
                             isBefore(date, startOfDay(new Date())) // Disable past dates
                           }
                           initialFocus={!field.value} // Focus only if no date selected
                           month={field.value || new Date()} // Start calendar at selected month or current
                           onMonthChange={(month) => { /* handle month change if needed, maybe fetch data */ }}
                        />
                      </PopoverContent>
                     )}
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Only show Time Slot section if date AND service are selected */}
            {selectedDateWatcher && selectedService && (
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Time Slots</FormLabel>
                     <Select
                       onValueChange={field.onChange}
                       value={field.value}
                        // Disable if loading, not on client, or explicitly no slots found (after loading)
                       disabled={isLoadingSlots || !isClient || (!isLoadingSlots && availableSlots.filter(slot => slot.available).length === 0)}
                      >
                      <FormControl>
                        <SelectTrigger>
                           <Clock className="mr-2 h-4 w-4" />
                           <SelectValue placeholder={
                              isLoadingSlots ? "Loading slots..." :
                              (availableSlots.filter(slot => slot.available).length > 0 ? "Select a time" : "No slots available")
                           } />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
                         {isLoadingSlots ? (
                           renderSlotSkeleton() // Use skeleton loader
                         ) : availableSlots.filter(slot => slot.available).length > 0 ? (
                             availableSlots
                                .filter(slot => slot.available)
                                .map((slot) => (
                                  <SelectItem key={slot.time} value={slot.time}>
                                    {formatTime(slot.time)} {/* Use formatTime utility */}
                                  </SelectItem>
                                ))
                           ) : (
                             <div className="p-4 text-center text-sm text-muted-foreground">
                               No available slots found.
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
             {/* Disable button if form is invalid, slots are loading, not client, or explicitly no slots available */}
             <Button
              type="submit"
              className="w-full"
              disabled={!form.formState.isValid || isLoadingSlots || !isClient || (!isLoadingSlots && availableSlots.filter(slot => slot.available).length === 0)}
              >
               {isLoadingSlots ? 'Loading...' : 'Book Appointment'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    