"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { addDays, format, isBefore } from 'date-fns';
import { CalendarIcon, Clock, Scissors } from 'lucide-react';
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
import { formatDate } from '@/lib/date-utils'; // Correct import path
import type { Service, Appointment, AvailableSlots, TimeSlot } from '@/types';

// Mock services data (replace with API call in a real app)
const services: Service[] = [
  { id: 'haircut', name: 'Haircut', duration: 30, price: 25 },
  { id: 'beard_trim', name: 'Beard Trim', duration: 20, price: 15 },
  { id: 'haircut_beard', name: 'Haircut & Beard Trim', duration: 50, price: 35 },
  { id: 'shave', name: 'Hot Towel Shave', duration: 40, price: 30 },
];

// Mock available slots (replace with API call in a real app)
// In a real app, this would depend on the barber's schedule, existing appointments, and service duration
const generateMockSlots = (date: Date): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const startHour = 9; // Barber starts at 9 AM
  const endHour = 17; // Barber ends at 5 PM
  const lunchStartHour = 12;
  const lunchEndHour = 13;

  for (let hour = startHour; hour < endHour; hour++) {
    if (hour >= lunchStartHour && hour < lunchEndHour) continue; // Skip lunch break

    for (let minute = 0; minute < 60; minute += 30) { // Assume 30-min slots for simplicity
      // Simulate some unavailable slots randomly
      const isAvailable = Math.random() > 0.3; // 70% chance of being available
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push({ time, available: isAvailable });
    }
  }
  return slots;
};


const bookingFormSchema = z.object({
  serviceId: z.string({ required_error: 'Please select a service.' }),
  date: z.date({ required_error: 'Please select a date.' }),
  time: z.string({ required_error: 'Please select a time slot.' }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function ClientBooking() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = React.useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceId: '',
      date: undefined,
      time: '',
    },
  });

  const selectedServiceId = form.watch('serviceId');
  const selectedService = services.find(s => s.id === selectedServiceId);

  // Fetch available slots when date or service changes
  React.useEffect(() => {
    if (selectedDate && selectedService) {
      setIsLoadingSlots(true);
      // Simulate API call delay
      setTimeout(() => {
        const slots = generateMockSlots(selectedDate);
        // Filter slots based on service duration (basic example)
        // A real implementation would need more complex logic
        setAvailableSlots(slots);
        setIsLoadingSlots(false);
        form.resetField('time'); // Reset time when date or service changes
      }, 500);
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, selectedService, form]);


  function onSubmit(data: BookingFormValues) {
     if (!selectedService) {
      toast({
        title: "Error",
        description: "Selected service not found.",
        variant: "destructive",
      });
      return;
    }

    const newAppointment: Appointment = {
      id: crypto.randomUUID(), // Generate a unique ID
      service: selectedService,
      date: data.date,
      time: data.time,
      // clientName is not needed for client-side storage
    };

    try {
      addClientAppointment(newAppointment);
      toast({
        title: 'Appointment Booked!',
        description: `Your ${selectedService.name} is scheduled for ${formatDate(data.date)} at ${format(new Date(`1970-01-01T${data.time}`), 'p')}.`,
      });
      form.reset();
      setSelectedDate(undefined); // Reset date picker
      setAvailableSlots([]); // Clear slots
      // Optionally trigger a refresh of the client appointments list
      window.dispatchEvent(new Event('storage'));
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
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setSelectedDate(date); // Update local state for slot fetching
                        }}
                        disabled={(date) =>
                          isBefore(date, addDays(new Date(), -1)) // Disable past dates
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDate && selectedService && (
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Time Slots</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingSlots || availableSlots.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                           <Clock className="mr-2 h-4 w-4" />
                           <SelectValue placeholder={isLoadingSlots ? "Loading slots..." : "Select a time"} />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
                        {isLoadingSlots ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : availableSlots.length > 0 ? (
                           availableSlots.map((slot) => (
                            <SelectItem key={slot.time} value={slot.time} disabled={!slot.available}>
                              {format(new Date(`1970-01-01T${slot.time}`), 'p')} { !slot.available ? '(Unavailable)' : ''}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-slots" disabled>No available slots for this date</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select an available time slot for your {selectedService?.duration} minute service.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={!form.formState.isValid || isLoadingSlots}>
              Book Appointment
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
