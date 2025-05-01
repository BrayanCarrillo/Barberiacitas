"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { addMinutes, isBefore, parse, startOfDay, setHours, setMinutes, format as formatDateFn, getDay } from 'date-fns'; // Renamed format import, added getDay
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
import { addClientAppointment, getClientAppointments } from '@/lib/storage';
import { getBarberSettingsFromStorage } from '@/lib/settings-storage'; // Import settings fetcher
import { cn } from '@/lib/utils';
import { formatDate, formatTime, isSameDay } from '@/lib/date-utils';
import type { Service, Appointment, TimeSlot, BarberSettings } from '@/types';
import { Skeleton } from '../ui/skeleton';


// Mock services data (replace with API call in a real app)
const services: Service[] = [
  { id: 'haircut', name: 'Corte de pelo', duration: 30, price: 25 },
  { id: 'beard_trim', name: 'Recorte de barba', duration: 20, price: 15 },
  { id: 'haircut_beard', name: 'Corte de pelo y barba', duration: 50, price: 35 },
  { id: 'shave', name: 'Afeitado con toalla caliente', duration: 40, price: 30 },
];

const daysOfWeekMap: { [key: number]: keyof Omit<BarberSettings, 'rentAmount' | 'breakTimes' | 'lunchBreak'> } = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};


// Helper to parse HH:mm time string relative to a given date
function parseTimeString(timeStr: string, date: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        console.warn(`Invalid time string format encountered: ${timeStr}. Using midnight.`);
        return setHours(setMinutes(startOfDay(date), 0), 0); // Default to midnight on error
    }
    return setHours(setMinutes(startOfDay(date), minutes), hours);
}

// Helper to check if a time range overlaps with any break/lunch times
function isOverlappingWithBreaks(
    slotStart: Date,
    slotEnd: Date,
    lunchBreak: { start: Date; end: Date },
    breakTimes: { start: Date; end: Date }[]
): boolean {
    // Check overlap with lunch
    if (slotStart < lunchBreak.end && slotEnd > lunchBreak.start) {
        return true;
    }
    // Check overlap with other breaks
    for (const breakTime of breakTimes) {
        if (slotStart < breakTime.end && slotEnd > breakTime.start) {
            return true;
        }
    }
    return false;
}


// Function to get available slots, now using BarberSettings
async function getAvailableSlotsForDate(
    date: Date,
    serviceDuration: number,
    settings: BarberSettings,
    existingAppointments: Appointment[]
): Promise<TimeSlot[]> {
    console.log(`Fetching slots for ${formatDateFn(date, 'yyyy-MM-dd')} with duration ${serviceDuration}min using settings:`, settings);

    const slots: TimeSlot[] = [];
    const intervalMinutes = 15; // Check availability every 15 minutes
    const now = new Date(); // Get current time
    const selectedDayStart = startOfDay(date);
    const isToday = isSameDay(selectedDayStart, startOfDay(now));
    const dayOfWeekIndex = getDay(selectedDayStart); // 0 for Sunday, 1 for Monday, etc.
    const dayKey = daysOfWeekMap[dayOfWeekIndex];
    const dailySchedule = settings[dayKey];

    console.log(`Checking schedule for ${dayKey}:`, dailySchedule);


    // 1. Check if the barber is available on this day of the week
    if (!dailySchedule || !dailySchedule.available || !dailySchedule.start || !dailySchedule.end) {
        console.log(`Barber not available on ${dayKey}.`);
        return []; // Return empty array if not available or schedule is incomplete
    }


    // Parse settings times relative to the selected date
    // Use the specific day's schedule now
    const workStart = parseTimeString(dailySchedule.start, selectedDayStart);
    const workEnd = parseTimeString(dailySchedule.end, selectedDayStart);
    const lunchStart = parseTimeString(settings.lunchBreak.start, selectedDayStart);
    const lunchEnd = parseTimeString(settings.lunchBreak.end, selectedDayStart);
    const breaks = settings.breakTimes.map(b => ({
        start: parseTimeString(b.start, selectedDayStart),
        end: parseTimeString(b.end, selectedDayStart),
    }));

     // Filter existing appointments for the selected date
     const appointmentsOnDate = existingAppointments.filter(app => isSameDay(app.date, selectedDayStart));

    let currentTime = new Date(workStart);

    console.log(`Work hours for ${dayKey}: ${formatTime(dailySchedule.start)} - ${formatTime(dailySchedule.end)}`);


    while (isBefore(currentTime, workEnd)) {
        const slotStartTime = new Date(currentTime);
        const slotEndTime = addMinutes(slotStartTime, serviceDuration);

        let isAvailable = true;

        // 2. Check if slot END goes past work end time for the specific day
        if (isBefore(workEnd, slotEndTime)) {
            isAvailable = false;
            // console.log(`Slot ${formatTime(formatDateFn(slotStartTime, 'HH:mm'))} unavailable: Ends after work (${formatTime(formatDateFn(workEnd, 'HH:mm'))})`);
        }

        // 3. Check if the slot overlaps with lunch or breaks
        if (isAvailable && isOverlappingWithBreaks(slotStartTime, slotEndTime, { start: lunchStart, end: lunchEnd }, breaks)) {
            isAvailable = false;
            // console.log(`Slot ${formatTime(formatDateFn(slotStartTime, 'HH:mm'))} unavailable: Overlaps break/lunch`);
        }

        // 4. Check if the slot is in the past (only if it's today)
        if (isAvailable && isToday && isBefore(slotStartTime, now)) {
            isAvailable = false;
            // console.log(`Slot ${formatTime(formatDateFn(slotStartTime, 'HH:mm'))} unavailable: Is in the past (Current time: ${formatTime(formatDateFn(now, 'HH:mm'))})`);
        }

         // 5. Check if the slot overlaps with an existing appointment
         if (isAvailable) {
            for (const existingApp of appointmentsOnDate) {
                // Ensure existingApp.time is valid before parsing
                if (!existingApp.time || !/^\d{2}:\d{2}$/.test(existingApp.time)) {
                   console.warn("Skipping existing appointment due to invalid time format:", existingApp);
                   continue; // Skip this appointment if time is invalid
                }
                const existingStart = parseTimeString(existingApp.time, selectedDayStart);
                const existingEnd = addMinutes(existingStart, existingApp.service.duration);
                // Check for overlap: (SlotStart < ExistingEnd) AND (SlotEnd > ExistingStart)
                if (slotStartTime < existingEnd && slotEndTime > existingStart) {
                    isAvailable = false;
                    // console.log(`Slot ${formatTime(formatDateFn(slotStartTime, 'HH:mm'))} unavailable: Overlaps existing appointment at ${formatTime(existingApp.time)}`);
                    break; // No need to check other appointments for this slot
                }
            }
        }


        const timeString = formatDateFn(slotStartTime, 'HH:mm');
        slots.push({ time: timeString, available: isAvailable });
        // console.log(`Slot ${formatTime(timeString)} is ${isAvailable ? 'available' : 'unavailable'}`);

        // Move to the next potential slot time
        currentTime = addMinutes(currentTime, intervalMinutes);
    }

    console.log(`Generated ${slots.length} slots for ${formatDateFn(date, 'yyyy-MM-dd')} (${dayKey}), ${slots.filter(s => s.available).length} available.`);
    return slots;
};


const bookingFormSchema = z.object({
  clientName: z.string().min(2, { message: 'Por favor ingresa tu nombre completo (mínimo 2 caracteres).' }).max(50, { message: 'El nombre no puede exceder los 50 caracteres.'}),
  serviceId: z.string({ required_error: 'Por favor selecciona un servicio.' }).min(1, { message: 'Por favor selecciona un servicio.' }),
  date: z.date({ required_error: 'Por favor selecciona una fecha.' }),
  time: z.string({ required_error: 'Por favor selecciona un horario.' }).min(1, { message: 'Por favor selecciona un horario.' }),
});


type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function ClientBooking() {
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = React.useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
  const [calendarOpen, setCalendarOpen] = React.useState(false); // State for calendar popover
  const [barberSettings, setBarberSettings] = React.useState<BarberSettings | null>(null); // State for settings
  const [existingAppointments, setExistingAppointments] = React.useState<Appointment[]>([]); // State for existing appointments

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

   React.useEffect(() => {
    setIsClient(true); // Set to true once component mounts on client
     // Fetch barber settings and existing appointments on mount
     const settings = getBarberSettingsFromStorage("barber123"); // Assuming a fixed barber ID for client view
     const appointments = getClientAppointments(); // Fetch all stored appointments initially
     console.log("ClientBooking Mount: Loaded Settings:", settings);
     console.log("ClientBooking Mount: Loaded Appointments:", appointments);
     setBarberSettings(settings);
     setExistingAppointments(appointments);

     // Add listener for settings changes
     const handleSettingsChange = (event: Event) => {
          const customEvent = event as CustomEvent<{ barberId: string; settings: BarberSettings }>;
         if (customEvent.detail?.barberId === "barber123") {
            console.log("ClientBooking: Detected barber settings change, updating state.");
            setBarberSettings(customEvent.detail.settings);
            // Refetch slots if date and service are already selected
             form.trigger(['date', 'serviceId']); // Trigger validation which re-runs the effect
         }
     };
     window.addEventListener('barberSettingsChanged', handleSettingsChange);

      // Add listener for storage changes (new/cancelled appointments)
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'barberEaseClientAppointments' || event.key === null) {
           console.log("ClientBooking: Detected storage change, updating appointments.");
           setExistingAppointments(getClientAppointments());
           // Refetch slots if date and service are already selected
           form.trigger(['date', 'serviceId']);
        }
      };
      window.addEventListener('storage', handleStorageChange);

      // Listen for custom event dispatched from client booking itself (less critical now with storage listener)
      const handleAppointmentBooked = () => {
           console.log("ClientBooking: Custom 'appointmentbooked' event received, updating.");
           setExistingAppointments(getClientAppointments());
           form.trigger(['date', 'serviceId']);
      }
      window.addEventListener('appointmentbooked', handleAppointmentBooked);


     return () => {
         window.removeEventListener('barberSettingsChanged', handleSettingsChange);
         window.removeEventListener('storage', handleStorageChange);
         window.removeEventListener('appointmentbooked', handleAppointmentBooked);
     };

  }, [form]); // Added form to dependency array for form.trigger

  const selectedServiceId = form.watch('serviceId');
  const selectedDateWatcher = form.watch('date'); // Watch date from form state
  const selectedService = services.find(s => s.id === selectedServiceId);

  // Fetch available slots when date or service changes
  React.useEffect(() => {
     // Ensure runs only on client and settings are loaded
     if (selectedDateWatcher && selectedService && barberSettings && isClient) {
      setIsLoadingSlots(true);
      setAvailableSlots([]); // Clear previous slots immediately
      form.resetField('time', { defaultValue: '' }); // Reset time when date or service changes
      console.log(`ClientBooking Effect: Fetching slots for ${formatDate(selectedDateWatcher)} and service ${selectedService.name}`);


      // Use a timeout to allow UI to update before potentially long fetch
       const timerId = setTimeout(() => {
           getAvailableSlotsForDate(selectedDateWatcher, selectedService.duration, barberSettings, existingAppointments)
            .then(slots => {
                console.log("ClientBooking Effect: Received slots:", slots);
                setAvailableSlots(slots);
                // Check if any slots are available
                 const hasAvailableSlots = slots.some(slot => slot.available);
                 if (!hasAvailableSlots) {
                   console.log("ClientBooking Effect: No available slots found for the selected criteria.");
                   // Use toast to inform user if no slots are available
                   toast({
                    title: "No hay horarios disponibles",
                    description: `No hay horarios disponibles actualmente para el ${formatDate(selectedDateWatcher)}. Por favor intenta con otra fecha o servicio.`,
                    variant: "default",
                    duration: 5000,
                   });
                 }
            })
            .catch(error => {
                console.error("ClientBooking Effect: Failed to fetch available slots:", error);
                setAvailableSlots([]);
                toast({
                    title: "Error al cargar horarios",
                    description: "No se pudieron cargar los horarios disponibles. Por favor intenta nuevamente.",
                    variant: "destructive",
                });
            })
            .finally(() => {
                console.log("ClientBooking Effect: Finished fetching slots.");
                setIsLoadingSlots(false); // Set loading false after fetch completes or fails
            });
       }, 100); // Small delay

       return () => clearTimeout(timerId); // Cleanup timeout if dependencies change quickly

    } else {
       // console.log("ClientBooking Effect: Conditions not met to fetch slots.", {selectedDateWatcher, selectedService, barberSettings, isClient});
       setAvailableSlots([]); // Clear slots if date/service/settings not ready
    }
  }, [selectedDateWatcher, selectedService, barberSettings, existingAppointments, isClient, form.resetField, toast]);


  function onSubmit(data: BookingFormValues) {
     if (!isClient) return; // Ensure crypto is available

     if (!selectedService) {
      toast({
        title: "Error",
        description: "Servicio seleccionado no encontrado.",
        variant: "destructive",
      });
      return;
    }

     // Additional check to ensure date and time are valid before submission
     if (!data.date || !data.time) {
        toast({
            title: "Información incompleta",
            description: "Por favor asegúrate de haber seleccionado una fecha y horario válidos.",
            variant: "destructive",
        });
        return;
     }
    console.log("Submitting booking:", data);


    const newAppointment: Appointment = {
      id: crypto.randomUUID(), // Generate a unique ID - Safe now due to isClient check
      clientName: data.clientName.trim(), // Trim whitespace from name
      service: selectedService,
      date: data.date,
      time: data.time,
    };

    try {
      addClientAppointment(newAppointment);
      console.log("Appointment added successfully:", newAppointment);
      toast({
        title: '¡Cita reservada!',
        description: `${newAppointment.clientName}, tu ${selectedService.name} está agendado para el ${formatDate(data.date)} a las ${formatTime(data.time)}.`,
      });
      form.reset(); // Reset the entire form
      setAvailableSlots([]); // Explicitly clear slots as well
      // Fetch updated appointments *after* adding the new one
      const updatedAppointments = getClientAppointments();
      console.log("Updating existingAppointments state after booking:", updatedAppointments);
      setExistingAppointments(updatedAppointments); // Update local state immediately


      // Trigger events to notify other components
       window.dispatchEvent(new CustomEvent('appointmentbooked'));
       window.dispatchEvent(new StorageEvent('storage', { key: 'barberEaseClientAppointments' }));

    } catch (error) {
       console.error("Booking submission error:", error); // Log the actual error
       toast({
        title: "Error al reservar",
        description: "No se pudo guardar la cita. Por favor intenta nuevamente o contacta soporte.",
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
        <CardTitle>Agenda tu visita</CardTitle>
        <CardDescription>Elige un servicio, fecha y horario.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-4">
             <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Ingresa tu nombre completo" className="pl-8" {...field} />
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
                  <FormLabel>Servicio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <Scissors className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Selecciona un servicio" />
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
                  <FormLabel>Fecha</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          // Disable until client side mount AND settings are loaded
                          disabled={!isClient || !barberSettings}
                        >
                          {field.value ? (
                            formatDate(field.value) // Use formatDate utility
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                     {/* Conditionally render PopoverContent only on client */}
                    {isClient && (
                       <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                             if (date) { // Ensure date is not undefined
                                field.onChange(startOfDay(date)); // Ensure we use the start of the day
                             } else {
                                field.onChange(undefined); // Explicitly set undefined if no date selected
                             }
                             setCalendarOpen(false); // Close popover on date select
                          }}
                           disabled={(date) =>
                             isBefore(startOfDay(date), startOfDay(new Date())) // Disable past dates including today if already past
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

            {/* Only show Time Slot section if date AND service AND settings are selected */}
            {selectedDateWatcher && selectedService && barberSettings && (
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horarios disponibles</FormLabel>
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
                              isLoadingSlots ? "Cargando horarios..." :
                              (availableSlots.filter(slot => slot.available).length > 0 ? "Selecciona un horario" : "No hay horarios disponibles")
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
                               No se encontraron horarios disponibles.
                             </div>
                           )}
                      </SelectContent>
                    </Select>
                    {selectedService && (
                        <FormDescription>
                          Los horarios mostrados son el inicio de tu servicio de {selectedService.duration} minutos.
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
               {isLoadingSlots ? 'Cargando...' : 'Reservar cita'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

