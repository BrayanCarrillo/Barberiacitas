
"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { addMinutes, isBefore, parse, startOfDay, setHours, setMinutes, format as formatDateFn, getDay, isSameDay, parseISO } from 'date-fns'; // Added parseISO
import { CalendarIcon, Clock, Scissors, User, Star, Info, AlertTriangle } from 'lucide-react';
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
import { Alert, AlertDescription as AlertDesc, AlertTitle as AlertT } from '@/components/ui/alert'; // Renamed imports
import { useToast } from '@/hooks/use-toast';
import { addClientAppointment, getClientAppointments } from '@/lib/storage';
import { getBarberSettingsFromStorage } from '@/lib/settings-storage';
import { getBookableItems, getBarberServices, getBarberCombos } from '@/lib/catalog-storage';
import { cn } from '@/lib/utils';
import { formatDate, formatTime } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/currency-utils';
import type { Service, Appointment, TimeSlot, BarberSettings, Combo, BookableItem, Announcement } from '@/types';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';

const daysOfWeekMap: { [key: number]: keyof Omit<BarberSettings, 'rentAmount' | 'breakTimes' | 'lunchBreak' | 'announcement'> } = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

function parseTimeString(timeStr: string | undefined, date: Date): Date {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
        return setHours(setMinutes(startOfDay(date), 0), 0);
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        return setHours(setMinutes(startOfDay(date), 0), 0);
    }
    return setHours(setMinutes(startOfDay(date), minutes), hours);
}

function isOverlappingWithBreaks(
    slotStart: Date, slotEnd: Date, lunchBreak: { start: Date; end: Date },
    breakTimes: { start: Date; end: Date }[]
): boolean {
    if (slotStart < lunchBreak.end && slotEnd > lunchBreak.start) return true;
    for (const breakTime of breakTimes) {
        if (slotStart < breakTime.end && slotEnd > breakTime.start) return true;
    }
    return false;
}

async function getAvailableSlotsForDate(
    date: Date, serviceDuration: number, settings: BarberSettings,
    existingAppointments: Appointment[], announcement?: Announcement
): Promise<TimeSlot[]> {
    console.log(`Fetching slots for ${formatDateFn(date, 'yyyy-MM-dd')} with duration ${serviceDuration}min.`);
    const slots: TimeSlot[] = [];
    const intervalMinutes = 15;
    const now = new Date();
    const selectedDayStart = startOfDay(date);
    const isToday = isSameDay(selectedDayStart, startOfDay(now));
    const dayOfWeekIndex = getDay(selectedDayStart);
    const dayKey = daysOfWeekMap[dayOfWeekIndex];
    let dailySchedule = settings[dayKey];

    // Check for active announcement affecting bookings for this day
    let workStartTimeStr = dailySchedule?.start;
    let workEndTimeStr = dailySchedule?.end;
    let dayClosedByAnnouncement = false;

    if (announcement?.isActive && announcement.effectiveDate && isSameDay(parseISO(announcement.effectiveDate), selectedDayStart)) {
        console.log("Active announcement found for selected date:", announcement);
        if (announcement.affectsBooking === 'closed_day') {
            console.log("Day closed by announcement.");
            dayClosedByAnnouncement = true;
        } else if (announcement.affectsBooking === 'custom_hours' && announcement.customStartTime && announcement.customEndTime) {
            console.log(`Custom hours by announcement: ${announcement.customStartTime} - ${announcement.customEndTime}`);
            workStartTimeStr = announcement.customStartTime;
            workEndTimeStr = announcement.customEndTime;
        }
    }

    if (dayClosedByAnnouncement) return [];
    if (!dailySchedule || !dailySchedule.available || !workStartTimeStr || !workEndTimeStr) return [];

    const workStart = parseTimeString(workStartTimeStr, selectedDayStart);
    const workEnd = parseTimeString(workEndTimeStr, selectedDayStart);
    const lunchStart = parseTimeString(settings.lunchBreak.start, selectedDayStart);
    const lunchEnd = parseTimeString(settings.lunchBreak.end, selectedDayStart);
    const breaks = settings.breakTimes.map(b => ({
        start: parseTimeString(b.start, selectedDayStart), end: parseTimeString(b.end, selectedDayStart),
    }));
    const appointmentsOnDate = existingAppointments.filter(app => isSameDay(app.date, selectedDayStart));

    let currentTime = new Date(workStart);
    if (isToday && isBefore(currentTime, now)) {
        const currentMinutes = now.getMinutes();
        const remainder = currentMinutes % intervalMinutes;
        const minutesToAdd = remainder === 0 ? 0 : intervalMinutes - remainder;
        currentTime = addMinutes(now, minutesToAdd);
        currentTime.setSeconds(0, 0);
    }
     console.log(`Effective work hours for ${dayKey}: ${formatTime(formatDateFn(workStart, 'HH:mm'))} - ${formatTime(formatDateFn(workEnd, 'HH:mm'))}`);


    while (isBefore(currentTime, workEnd)) {
        const slotStartTime = new Date(currentTime);
        const duration = serviceDuration > 0 ? serviceDuration : 0;
        const slotEndTime = addMinutes(slotStartTime, duration);
        let isAvailable = true;

        if (isBefore(workEnd, slotEndTime)) isAvailable = false;
        if (isAvailable && isOverlappingWithBreaks(slotStartTime, slotEndTime, { start: lunchStart, end: lunchEnd }, breaks)) isAvailable = false;
        if (isAvailable && isToday && isBefore(slotStartTime, now)) isAvailable = false;
        if (isAvailable) {
            for (const existingApp of appointmentsOnDate) {
                if (!existingApp.time || !/^\d{2}:\d{2}$/.test(existingApp.time)) continue;
                const existingStart = parseTimeString(existingApp.time, selectedDayStart);
                const existingDuration = existingApp.bookedItem.duration > 0 ? existingApp.bookedItem.duration : 0;
                const existingEnd = addMinutes(existingStart, existingDuration);
                if (slotStartTime < existingEnd && slotEndTime > existingStart) {
                    isAvailable = false; break;
                }
            }
        }
        slots.push({ time: formatDateFn(slotStartTime, 'HH:mm'), available: isAvailable });
        currentTime = addMinutes(currentTime, intervalMinutes);
    }
    console.log(`Generated ${slots.length} slots for ${formatDateFn(date, 'yyyy-MM-dd')} (${dayKey}), ${slots.filter(s => s.available).length} available.`);
    return slots;
};

const bookingFormSchema = z.object({
  clientName: z.string().min(2, { message: 'Por favor ingresa tu nombre y apellido (mínimo 2 caracteres).' }).max(50, { message: 'El nombre no puede exceder los 50 caracteres.'}),
  itemId: z.string({ required_error: 'Por favor selecciona un servicio o combo.' }).min(1, { message: 'Por favor selecciona un servicio o combo.' }),
  date: z.date({ required_error: 'Por favor selecciona una fecha.' }),
  time: z.string({ required_error: 'Por favor selecciona un horario.' }).min(1, { message: 'Por favor selecciona un horario.' }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const hasExceededBookingLimit = (appointments: Appointment[], date: Date, maxBookings: number): boolean => {
   const appointmentsOnDate = appointments.filter(app => isSameDay(app.date, date));
   return appointmentsOnDate.length >= maxBookings;
};

const setBookingStatus = (date: string, status: boolean) => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(`bookingStatus_${date}`, JSON.stringify(status)); }
    catch (error) { console.error("Error setting booking status:", error); }
};

const getBookingStatus = (date: string): boolean => {
    if (typeof window === 'undefined') return false;
    try { const status = localStorage.getItem(`bookingStatus_${date}`); return status ? JSON.parse(status) : false; }
    catch (error) { console.error("Error getting booking status:", error); return false; }
};

export function ClientBooking() {
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = React.useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [barberSettings, setBarberSettings] = React.useState<BarberSettings | null>(null);
  const [existingAppointments, setExistingAppointments] = React.useState<Appointment[]>([]);
  const [bookableItems, setBookableItems] = React.useState<BookableItem[]>([]);
  const [allServices, setAllServices] = React.useState<Service[]>([]);
  const [allCombos, setAllCombos] = React.useState<Combo[]>([]);
  const [selectedDateHasBooked, setSelectedDateHasBooked] = React.useState(false);
  const maxBookingsPerDay = 2;

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { clientName: '', itemId: '', date: undefined, time: '' },
    mode: "onChange",
  });

  const fetchCatalogData = React.useCallback(() => {
    const items = getBookableItems("barber123");
    const services = getBarberServices("barber123");
    const combos = getBarberCombos("barber123");
    setBookableItems(items); setAllServices(services); setAllCombos(combos);
  }, []);

  React.useEffect(() => {
    setIsClient(true);
    const settings = getBarberSettingsFromStorage("barber123");
    const appointments = getClientAppointments();
    setBarberSettings(settings); setExistingAppointments(appointments);
    fetchCatalogData();

    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ barberId: string; settings: BarberSettings }>;
      if (customEvent.detail?.barberId === "barber123") {
        console.log("ClientBooking: Settings changed, updating. New announcement:", customEvent.detail.settings.announcement);
        setBarberSettings(customEvent.detail.settings);
        if (form.getValues('date') && form.getValues('itemId')) form.trigger(['date', 'itemId']);
      }
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'barberEaseClientAppointments' || event.key === null) {
        setExistingAppointments(getClientAppointments());
        if (form.getValues('date') && form.getValues('itemId')) form.trigger(['date', 'itemId']);
      }
    };
    const handleAppointmentBooked = () => {
      setExistingAppointments(getClientAppointments());
      if (form.getValues('date') && form.getValues('itemId')) form.trigger(['date', 'itemId']);
    };
    const handleCatalogChange = () => fetchCatalogData();

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
  }, [form, fetchCatalogData]);

  const selectedItemId = form.watch('itemId');
  const selectedDateWatcher = form.watch('date');
  const selectedItem = bookableItems.find(s => s.id === selectedItemId);

  const calculateComboDuration = React.useCallback((combo: Combo): number => {
    if (!combo || !Array.isArray(combo.serviceIds)) return 0;
    return combo.serviceIds.reduce((total, serviceId) => {
      const service = allServices.find(s => s.id === serviceId);
      return total + (service?.duration || 0);
    }, 0);
  }, [allServices]);

  const selectedItemDuration = React.useMemo(() => {
    if (!selectedItem) return 0;
    if (selectedItem.type === 'service') return selectedItem.duration;
    if (selectedItem.type === 'combo') return calculateComboDuration(selectedItem as Combo);
    return 0;
  }, [selectedItem, calculateComboDuration]);

  React.useEffect(() => {
    if (selectedDateWatcher && selectedItem && selectedItemDuration > 0 && barberSettings && isClient) {
      setIsLoadingSlots(true); setAvailableSlots([]);
      form.resetField('time', { defaultValue: '' });
      console.log(`ClientBooking Effect: Fetching slots for ${formatDate(selectedDateWatcher)} and item ${selectedItem.name} (Duration: ${selectedItemDuration})`);
      const selectedDateString = formatDate(selectedDateWatcher);
      const hasBooked = getBookingStatus(selectedDateString);
      setSelectedDateHasBooked(hasBooked);

      if (hasBooked) {
        toast({ title: "Límite de reservas", description: "Ya has alcanzado el límite de reservas para este día.", variant: "default" });
        setIsLoadingSlots(false); return;
      }
      if (hasExceededBookingLimit(existingAppointments, selectedDateWatcher, maxBookingsPerDay)) {
        toast({ title: "Límite de Reservas Excedido", description: `Has alcanzado el límite máximo de ${maxBookingsPerDay} reservas para este día.`, variant: "warning" });
        setIsLoadingSlots(false); return;
      }

      getAvailableSlotsForDate(selectedDateWatcher, selectedItemDuration, barberSettings, existingAppointments, barberSettings.announcement)
        .then(slots => {
          setAvailableSlots(slots);
          if (!slots.some(slot => slot.available)) {
            toast({ title: "No hay horarios disponibles", description: `No hay horarios disponibles para ${formatDate(selectedDateWatcher)}. Por favor intenta otra fecha o servicio.`, variant: "default", duration: 5000 });
          }
        })
        .catch(error => {
          console.error("Error fetching slots:", error); setAvailableSlots([]);
          toast({ title: "Error Cargando Horarios", description: "No se pudieron cargar los horarios disponibles.", variant: "destructive" });
        })
        .finally(() => setIsLoadingSlots(false));
    } else {
      if (selectedItem && selectedItemDuration === 0) console.warn("Selected item has zero duration.");
      setAvailableSlots([]); setSelectedDateHasBooked(false);
    }
  }, [selectedDateWatcher, selectedItemId, selectedItemDuration, barberSettings, existingAppointments, isClient, toast, form]);

  function onSubmit(data: BookingFormValues) {
    if (!isClient) return;
    const selectedDateString = formatDate(data.date);
    if (getBookingStatus(selectedDateString)) {
      toast({ title: "Límite de Reservas", description: "Ya has alcanzado tu límite de reservas para este día." }); return;
    }
    if (hasExceededBookingLimit(existingAppointments, data.date, maxBookingsPerDay)) {
      toast({ title: "Límite de Reservas Excedido", description: `Has alcanzado el límite máximo de ${maxBookingsPerDay} reservas para este día.` }); return;
    }

    const currentSelectedItem = bookableItems.find(item => item.id === data.itemId);
    if (!currentSelectedItem) {
      toast({ title: "Error", description: "El servicio o combo seleccionado ya no está disponible.", variant: "destructive" }); return;
    }
    let bookedItemDuration = 0;
    if (currentSelectedItem.type === 'service') bookedItemDuration = currentSelectedItem.duration;
    else if (currentSelectedItem.type === 'combo') bookedItemDuration = calculateComboDuration(currentSelectedItem as Combo);

    if (bookedItemDuration <= 0) {
      toast({ title: "Error de Reserva", description: "No se puede reservar un servicio o combo sin duración.", variant: "destructive" }); return;
    }
    if (!data.date || !data.time) {
      toast({ title: "Información Incompleta", description: "Por favor selecciona una fecha y hora válidas.", variant: "destructive" }); return;
    }

    const newAppointment: Appointment = {
      id: crypto.randomUUID(), clientName: data.clientName.trim(),
      bookedItem: { id: currentSelectedItem.id, type: currentSelectedItem.type, name: currentSelectedItem.name, duration: bookedItemDuration, price: currentSelectedItem.price },
      date: data.date, time: data.time, status: 'completed',
    };

    try {
      addClientAppointment(newAppointment);
      toast({ title: '¡Reserva Exitosa!', description: `${newAppointment.clientName}, tu ${newAppointment.bookedItem.name} está agendado para el ${formatDate(data.date)} a las ${formatTime(data.time)}.` });
      setBookingStatus(selectedDateString, true); setSelectedDateHasBooked(true);
      form.reset(); setAvailableSlots([]); setExistingAppointments(getClientAppointments());
      window.dispatchEvent(new CustomEvent('appointmentbooked'));
      window.dispatchEvent(new StorageEvent('storage', { key: 'barberEaseClientAppointments' }));
    } catch (error) {
      console.error("Booking submission error:", error);
      toast({ title: "Error de Reserva", description: "No se pudo guardar la reserva.", variant: "destructive" });
    }
  }

  const renderSlotSkeleton = (count = 5) => (
    <div className="space-y-2">
      <Skeleton className="h-9 w-full rounded-md" />
      {Array.from({ length: count - 1 }).map((_, i) => (<Skeleton key={i} className="h-8 w-full rounded-md opacity-75" />))}
    </div>
  );

  const currentAnnouncement = barberSettings?.announcement;
  const isAnnouncementActiveForSelectedDate = currentAnnouncement?.isActive && currentAnnouncement.effectiveDate && selectedDateWatcher && isSameDay(parseISO(currentAnnouncement.effectiveDate), selectedDateWatcher);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Reserva tu Visita</CardTitle>
        <CardDescription>Elige un servicio o combo, fecha y hora.</CardDescription>
      </CardHeader>

      {isClient && currentAnnouncement?.isActive && (
        <div className="px-6 pb-4">
            <Alert variant={currentAnnouncement.affectsBooking !== 'none' ? "destructive" : "default"} className="mb-4">
                 {currentAnnouncement.affectsBooking !== 'none' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                <AlertT>Anuncio Importante</AlertT>
                <AlertDesc>{currentAnnouncement.message}</AlertDesc>
                {currentAnnouncement.effectiveDate && (
                    <AlertDesc className="text-xs mt-1">
                        Válido para: {formatDate(parseISO(currentAnnouncement.effectiveDate))}
                        {currentAnnouncement.affectsBooking === 'custom_hours' && currentAnnouncement.customStartTime && currentAnnouncement.customEndTime && ` (Horario especial: ${formatTime(currentAnnouncement.customStartTime)} - ${formatTime(currentAnnouncement.customEndTime)})`}
                    </AlertDesc>
                )}
            </Alert>
        </div>
      )}


      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-4">
            <FormField
              control={form.control} name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre y Apellido</FormLabel>
                  <FormControl><div className="relative"><User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Ingresa tu nombre y apellido" className="pl-8" {...field} /></div></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control} name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servicio / Combo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        {selectedItem?.type === 'combo' ? <Star className="mr-2 h-4 w-4" /> : <Scissors className="mr-2 h-4 w-4" />}
                        <SelectValue placeholder="Selecciona un servicio o combo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bookableItems.length === 0 && <SelectItem value="loading" disabled>Cargando items...</SelectItem>}
                      {allServices.length > 0 && <FormLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Servicios</FormLabel>}
                      {allServices.map(item => (<SelectItem key={item.id} value={item.id}>{item.name} ({formatCurrency(item.price)}) - {item.duration} min</SelectItem>))}
                      {allCombos.length > 0 && (<><Separator className="my-1" /><FormLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Combos</FormLabel></>)}
                      {allCombos.map(item => (<SelectItem key={item.id} value={item.id}>{item.name} ({formatCurrency(item.price)}) - {calculateComboDuration(item)} min</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control} name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!isClient || !barberSettings}>
                          {field.value ? formatDate(field.value) : <span>Selecciona una fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    {isClient && (
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value}
                          onSelect={(date) => { if (date) field.onChange(startOfDay(date)); else field.onChange(undefined); setCalendarOpen(false); }}
                          disabled={date => isBefore(startOfDay(date), startOfDay(new Date()))}
                          initialFocus={!field.value} month={field.value || new Date()}
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
                control={form.control} name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horarios Disponibles</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}
                      disabled={isLoadingSlots || !isClient || selectedDateHasBooked || isAnnouncementActiveForSelectedDate && currentAnnouncement?.affectsBooking === 'closed_day' || (!isLoadingSlots && availableSlots.filter(slot => slot.available).length === 0)}>
                      <FormControl>
                        <SelectTrigger>
                          <Clock className="mr-2 h-4 w-4" />
                          <SelectValue placeholder={
                            isLoadingSlots ? "Cargando horarios..." :
                            selectedDateHasBooked ? "Límite de reservas alcanzado" :
                            isAnnouncementActiveForSelectedDate && currentAnnouncement?.affectsBooking === 'closed_day' ? "Día cerrado por anuncio" :
                            (availableSlots.filter(slot => slot.available).length > 0 ? "Selecciona un horario" : "No hay horarios disponibles")
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingSlots ? renderSlotSkeleton() :
                          availableSlots.filter(slot => slot.available).length > 0 ?
                            availableSlots.filter(slot => slot.available).map(slot => (<SelectItem key={slot.time} value={slot.time}>{formatTime(slot.time)}</SelectItem>))
                            : <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron horarios.</div>
                        }
                      </SelectContent>
                    </Select>
                    {selectedItem && selectedItemDuration > 0 && <FormDescription>Los horarios mostrados son el inicio de tu cita de {selectedItemDuration} minutos.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full"
              disabled={!form.formState.isValid || isLoadingSlots || !isClient || selectedDateHasBooked || isAnnouncementActiveForSelectedDate && currentAnnouncement?.affectsBooking === 'closed_day' || (!isLoadingSlots && availableSlots.filter(slot => slot.available).length === 0) || selectedItemDuration <= 0}>
              {isLoadingSlots ? 'Cargando...' : 'Reservar Cita'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
