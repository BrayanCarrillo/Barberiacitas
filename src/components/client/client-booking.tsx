"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { addMinutes, isBefore, parse, startOfDay, setHours, setMinutes, format as formatDateFn, getDay } from 'date-fns';
import { CalendarIcon, Clock, Scissors, User, Star } from 'lucide-react'; // Added Star icon
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
import { getBarberSettingsFromStorage } from '@/lib/settings-storage';
import { getBookableItems, getBarberServices, getBarberCombos } from '@/lib/catalog-storage'; // Use catalog storage
import { cn } from '@/lib/utils';
import { formatDate, formatTime, isSameDay } from '@/lib/date-utils';
import type { Service, Appointment, TimeSlot, BarberSettings, Combo, BookableItem } from '@/types';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

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
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
        console.warn(`Invalid time string format encountered: ${timeStr}. Using midnight.`);
        return setHours(setMinutes(startOfDay(date), 0), 0); // Default to midnight on error
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        console.warn(`Invalid time string values after split: ${timeStr}. Using midnight.`);
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
    // If it's today, start checking from the *current* time if it's later than work start
    if (isToday && isBefore(currentTime, now)) {
        // Round current time up to the nearest interval minute
        const currentMinutes = now.getMinutes();
        const remainder = currentMinutes % intervalMinutes;
        const minutesToAdd = remainder === 0 ? 0 : intervalMinutes - remainder;
        currentTime = addMinutes(now, minutesToAdd);
        currentTime.setSeconds(0, 0); // Reset seconds and milliseconds
        console.log(`Is today. Adjusted start time to check from: ${formatTime(formatDateFn(currentTime, 'HH:mm'))}`);
    } else {
        console.log(`Current time starts at: ${formatTime(formatDateFn(currentTime, 'HH:mm'))}`);
    }
    console.log(`Work hours for ${dayKey}: ${formatTime(dailySchedule.start)} - ${formatTime(dailySchedule.end)}`);


    while (isBefore(currentTime, workEnd)) {
        const slotStartTime = new Date(currentTime);
        // Ensure service duration is positive, default to 0 if not
        const duration = serviceDuration > 0 ? serviceDuration : 0;
        const slotEndTime = addMinutes(slotStartTime, duration);

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

        // 4. Check if the slot START is in the past (only if it's today)
        // Allow booking only if the START time is >= now
         if (isAvailable && isToday && isBefore(slotStartTime, now)) {
             isAvailable = false;
            // console.log(`Slot ${formatTime(formatDateFn(slotStartTime, 'HH:mm'))} unavailable: Start time is in the past (Current time: ${formatTime(formatDateFn(now, 'HH:mm'))})`);
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
                 // Use bookedItem.duration for existing appointments
                const existingDuration = existingApp.bookedItem.duration > 0 ? existingApp.bookedItem.duration : 0;
                const existingEnd = addMinutes(existingStart, existingDuration);
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
  clientName: z.string().min(2, { message: 'Please enter your full name (minimum 2 characters).' }).max(50, { message: 'Name cannot exceed 50 characters.'}),
  itemId: z.string({ required_error: 'Please select a service or combo.' }).min(1, { message: 'Please select a service or combo.' }), // Renamed from serviceId
  date: z.date({ required_error: 'Please select a date.' }),
  time: z.string({ required_error: 'Please select a time slot.' }).min(1, { message: 'Please select a time slot.' }),
});


type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function ClientBooking() {
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = React.useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [barberSettings, setBarberSettings] = React.useState<BarberSettings | null>(null);
  const [existingAppointments, setExistingAppointments] = React.useState<Appointment[]>([]);
  const [bookableItems, setBookableItems] = React.useState<BookableItem[]>([]); // State for services/combos
  const [allServices, setAllServices] = React.useState<Service[]>([]); // Need services for combo duration calculation
  const [allCombos, setAllCombos] = React.useState<Combo[]>([]); // Also need combos for selection


  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: '',
      itemId: '', // Changed from serviceId
      date: undefined,
      time: '',
    },
     mode: "onChange",
  });

    const fetchCatalogData = React.useCallback(() => {
        const items = getBookableItems("barber123");
        const services = getBarberServices("barber123");
        const combos = getBarberCombos("barber123");
        console.log("ClientBooking: Loaded Bookable Items:", items);
        setBookableItems(items);
        setAllServices(services);
        setAllCombos(combos); // Store combos separately as well
    }, []);


   React.useEffect(() => {
    setIsClient(true);
    const settings = getBarberSettingsFromStorage("barber123");
    const appointments = getClientAppointments();
    console.log("ClientBooking Mount: Loaded Settings:", settings);
    console.log("ClientBooking Mount: Loaded Appointments:", appointments);
    setBarberSettings(settings);
    setExistingAppointments(appointments);
    fetchCatalogData(); // Fetch initial catalog data

     const handleSettingsChange = (event: Event) => {
          const customEvent = event as CustomEvent<{ barberId: string; settings: BarberSettings }>;
         if (customEvent.detail?.barberId === "barber123") {
            console.log("ClientBooking: Detected barber settings change, updating state.");
            setBarberSettings(customEvent.detail.settings);
            // Trigger validation or refetch slots if date/service already selected
            if (form.getValues('date') && form.getValues('itemId')) {
                 form.trigger(['date', 'itemId']);
            }
         }
     };
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'barberEaseClientAppointments' || event.key === null) {
           console.log("ClientBooking: Detected storage change, updating appointments.");
           setExistingAppointments(getClientAppointments());
           // Trigger validation or refetch slots if date/service already selected
            if (form.getValues('date') && form.getValues('itemId')) {
                 form.trigger(['date', 'itemId']);
            }
        }
      };
       const handleAppointmentBooked = () => {
           console.log("ClientBooking: Custom 'appointmentbooked' event received, updating.");
           setExistingAppointments(getClientAppointments());
           // Trigger validation or refetch slots if date/service already selected
            if (form.getValues('date') && form.getValues('itemId')) {
                 form.trigger(['date', 'itemId']);
            }
      };
       const handleCatalogChange = () => {
           console.log("ClientBooking: Catalog change detected, refetching bookable items.");
           fetchCatalogData();
       };

     window.addEventListener('barberSettingsChanged', handleSettingsChange);
     window.addEventListener('storage', handleStorageChange);
     window.addEventListener('appointmentbooked', handleAppointmentBooked);
     window.addEventListener('catalogChanged', handleCatalogChange);


     return () => {
         window.removeEventListener('barberSettingsChanged', handleSettingsChange);
         window.removeEventListener('storage', handleStorageChange);
         window.removeEventListener('appointmentbooked', handleAppointmentBooked);
         window.removeEventListener('catalogChanged', handleCatalogChange);
     };

  }, [form, fetchCatalogData]); // Added form and fetchCatalogData


  const selectedItemId = form.watch('itemId'); // Renamed from selectedServiceId
  const selectedDateWatcher = form.watch('date');
  const selectedItem = bookableItems.find(s => s.id === selectedItemId); // Find selected item

    // Function to calculate combo duration
    const calculateComboDuration = React.useCallback((combo: Combo): number => {
        if (!combo || !Array.isArray(combo.serviceIds)) return 0;
        return combo.serviceIds.reduce((total, serviceId) => {
            const service = allServices.find(s => s.id === serviceId);
            return total + (service?.duration || 0);
        }, 0);
    }, [allServices]); // Depends on allServices being up-to-date


  // Calculate duration for the selected item
   const selectedItemDuration = React.useMemo(() => {
        if (!selectedItem) return 0;
        if (selectedItem.type === 'service') {
            return selectedItem.duration;
        } else if (selectedItem.type === 'combo') {
            // Calculate combo duration based on included services
            return calculateComboDuration(selectedItem as Combo);
        }
        return 0;
    }, [selectedItem, calculateComboDuration]);


  // Fetch available slots when date or selected item (and its duration) changes
  React.useEffect(() => {
     if (selectedDateWatcher && selectedItem && selectedItemDuration > 0 && barberSettings && isClient) { // Check duration > 0
      setIsLoadingSlots(true);
      setAvailableSlots([]); // Clear previous slots
      form.resetField('time', { defaultValue: '' }); // Reset time selection
      console.log(`ClientBooking Effect: Fetching slots for ${formatDate(selectedDateWatcher)} and item ${selectedItem.name} (Duration: ${selectedItemDuration})`);

      getAvailableSlotsForDate(selectedDateWatcher, selectedItemDuration, barberSettings, existingAppointments)
      .then(slots => {
          console.log("ClientBooking Effect: Received slots:", slots);
          setAvailableSlots(slots); // Update state with new slots
          const hasAvailableSlots = slots.some(slot => slot.available);
          if (!hasAvailableSlots) {
             console.log("ClientBooking Effect: No available slots found for the selected criteria.");
             toast({
              title: "No time slots available",
              description: `No time slots are currently available for ${formatDate(selectedDateWatcher)}. Please try another date or service.`,
              variant: "default",
              duration: 5000,
             });
           }
      })
      .catch(error => {
          console.error("ClientBooking Effect: Failed to fetch available slots:", error);
          setAvailableSlots([]); // Ensure slots are cleared on error
          toast({
              title: "Error Loading Slots",
              description: "Could not load available time slots. Please try again.",
              variant: "destructive",
          });
      })
      .finally(() => {
          console.log("ClientBooking Effect: Finished fetching slots.");
          setIsLoadingSlots(false); // Set loading to false *after* processing
      });

    } else {
        if (selectedItem && selectedItemDuration === 0) {
            console.warn("ClientBooking Effect: Selected item has zero duration, cannot fetch slots.");
        }
       setAvailableSlots([]); // Clear slots if conditions aren't met
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateWatcher, selectedItemId, selectedItemDuration, barberSettings, existingAppointments, isClient, toast]);
    // Important: Only include selectedItemId in deps, not selectedItem directly
    // Also removed form.resetField from deps as it caused infinite loops


  function onSubmit(data: BookingFormValues) {
     if (!isClient) return;

     // Find the item again *at submission time* to ensure it's still valid
     const currentSelectedItem = bookableItems.find(item => item.id === data.itemId);

     if (!currentSelectedItem) {
      toast({
        title: "Error",
        description: "Selected service or combo not found or is no longer available.",
        variant: "destructive",
      });
      return;
    }
     // Recalculate duration at submission time
     let bookedItemDuration = 0;
     if (currentSelectedItem.type === 'service') {
         bookedItemDuration = currentSelectedItem.duration;
     } else if (currentSelectedItem.type === 'combo') {
         bookedItemDuration = calculateComboDuration(currentSelectedItem as Combo);
     }


     if (bookedItemDuration <= 0) {
          toast({
            title: "Booking Error",
            description: "Cannot book an item with zero duration.",
            variant: "destructive",
          });
          return;
     }

     if (!data.date || !data.time) {
        toast({
            title: "Incomplete Information",
            description: "Please ensure you have selected a valid date and time slot.",
            variant: "destructive",
        });
        return;
     }
    console.log("Submitting booking:", data);


    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      clientName: data.clientName.trim(),
      // Store details of the booked item
       bookedItem: {
          id: currentSelectedItem.id,
          type: currentSelectedItem.type,
          name: currentSelectedItem.name,
          duration: bookedItemDuration,
          price: currentSelectedItem.price,
      },
      date: data.date,
      time: data.time,
    };

    try {
      addClientAppointment(newAppointment);
      console.log("Appointment added successfully:", newAppointment);
      toast({
        title: 'Appointment Booked!',
        description: `${newAppointment.clientName}, your ${newAppointment.bookedItem.name} is scheduled for ${formatDate(data.date)} at ${formatTime(data.time)}.`,
      });
      form.reset();
      setAvailableSlots([]);
      const updatedAppointments = getClientAppointments();
      console.log("Updating existingAppointments state after booking:", updatedAppointments);
      setExistingAppointments(updatedAppointments);


       window.dispatchEvent(new CustomEvent('appointmentbooked'));
       window.dispatchEvent(new StorageEvent('storage', { key: 'barberEaseClientAppointments' }));

    } catch (error) {
       console.error("Booking submission error:", error);
       toast({
        title: "Booking Error",
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
        <CardTitle>Book Your Visit</CardTitle>
        <CardDescription>Choose a service or combo, date, and time.</CardDescription>
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

            {/* Updated Select for Services/Combos */}
            <FormField
              control={form.control}
              name="itemId" // Changed from serviceId
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service / Combo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                         {/* Use appropriate icon based on selected item type */}
                         {selectedItem?.type === 'combo' ? <Star className="mr-2 h-4 w-4" /> : <Scissors className="mr-2 h-4 w-4" />}
                        <SelectValue placeholder="Select a service or combo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bookableItems.length === 0 && <SelectItem value="loading" disabled>Loading items...</SelectItem>}
                      {/* Group services and combos */}
                       {allServices.length > 0 && (
                          <FormLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Services</FormLabel>
                       )}
                       {allServices.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                                {item.name} (${item.price.toFixed(2)}) - {item.duration} min
                            </SelectItem>
                       ))}
                       {allCombos.length > 0 && (
                            <>
                                <Separator className="my-1" />
                                <FormLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Combos</FormLabel>
                            </>
                       )}
                       {allCombos.map((item) => {
                           const duration = calculateComboDuration(item); // Use the stored function
                           return (
                               <SelectItem key={item.id} value={item.id}>
                                   {item.name} (${item.price.toFixed(2)}) - {duration} min
                               </SelectItem>
                           );
                       })}
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
                          disabled={!isClient || !barberSettings}
                        >
                          {field.value ? (
                            formatDate(field.value)
                          ) : (
                            <span>Select a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    {isClient && (
                       <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                             if (date) {
                                field.onChange(startOfDay(date));
                             } else {
                                field.onChange(undefined);
                             }
                             setCalendarOpen(false);
                          }}
                           disabled={(date) =>
                             isBefore(startOfDay(date), startOfDay(new Date()))
                           }
                           initialFocus={!field.value}
                           month={field.value || new Date()}
                           onMonthChange={(month) => { /* handle month change if needed */ }}
                        />
                      </PopoverContent>
                     )}
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDateWatcher && selectedItem && selectedItemDuration > 0 && barberSettings && (
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Time Slots</FormLabel>
                     <Select
                       onValueChange={field.onChange}
                       value={field.value}
                       disabled={isLoadingSlots || !isClient || (!isLoadingSlots && availableSlots.filter(slot => slot.available).length === 0)}
                      >
                      <FormControl>
                        <SelectTrigger>
                           <Clock className="mr-2 h-4 w-4" />
                           <SelectValue placeholder={
                              isLoadingSlots ? "Loading slots..." :
                              (availableSlots.filter(slot => slot.available).length > 0 ? "Select a time slot" : "No slots available")
                           } />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
                         {isLoadingSlots ? (
                           renderSlotSkeleton()
                         ) : availableSlots.filter(slot => slot.available).length > 0 ? (
                             availableSlots
                                .filter(slot => slot.available)
                                .map((slot) => (
                                  <SelectItem key={slot.time} value={slot.time}>
                                    {formatTime(slot.time)}
                                  </SelectItem>
                                ))
                           ) : (
                             <div className="p-4 text-center text-sm text-muted-foreground">
                               No available slots found.
                             </div>
                           )}
                      </SelectContent>
                    </Select>
                    {selectedItem && selectedItemDuration > 0 && (
                        <FormDescription>
                          Time slots shown are the start of your {selectedItemDuration} minute appointment.
                        </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter>
             <Button
              type="submit"
              className="w-full"
              disabled={!form.formState.isValid || isLoadingSlots || !isClient || (!isLoadingSlots && availableSlots.filter(slot => slot.available).length === 0) || selectedItemDuration <= 0}
              >
               {isLoadingSlots ? 'Loading...' : 'Book Appointment'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}