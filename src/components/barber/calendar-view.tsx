"use client";

import * as React from 'react';
import { format, startOfDay, isSameDay, parse, isBefore } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Appointment } from '@/types';
import { getClientAppointments, removeClientAppointment } from '@/lib/storage'; // Import function to get appointments from storage
import { saveClientAppointments } from '@/lib/storage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Clock, User, Scissors, Star, CheckCircle, XCircle, UserX } from 'lucide-react'; // Added Star icon
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { formatTime } from '@/lib/date-utils'; // Import formatTime utility
import { formatCurrency } from '@/lib/currency-utils'; // Import currency formatter
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils'; // Import cn utility

// Function to get appointments filtered by date from localStorage
function getBarberAppointmentsForDate(date: Date): Appointment[] {
  console.log(`Fetching appointments from storage for date ${format(date, 'yyyy-MM-dd')}`);
  try {
    const allAppointments = getClientAppointments(); // Fetch all client appointments

    // Filter for the selected date and sort by time
    return allAppointments
      .filter(app => isSameDay(app.date, date))
      .sort((a, b) => {
        // Ensure time exists before parsing
        const timeAStr = a.time || '00:00';
        const timeBStr = b.time || '00:00';
        // Create date objects using the appointment's date to handle potential day rollovers if needed
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const timeA = parse(timeAStr, 'HH:mm', dateA);
        const timeB = parse(timeBStr, 'HH:mm', dateB);
        return timeA.getTime() - timeB.getTime();
      });
  } catch (error) {
      console.error("Error fetching or filtering appointments from storage:", error);
      return []; // Return empty array on error
  }
}

interface CalendarViewProps {
  barberId: string; // Keep barberId prop for potential future backend integration
}

export function CalendarView({ barberId }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentClientTime, setCurrentClientTime] = React.useState<Date | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = React.useState(false);


  React.useEffect(() => {
    setIsClient(true);
  }, []);


  // Set initial date and client time on mount (client-side only)
  React.useEffect(() => {
    if(isClient) {
        setSelectedDate(startOfDay(new Date()));
        setCurrentClientTime(new Date());
        // Timer to update current time periodically for isPast check (optional)
        const timer = setInterval(() => setCurrentClientTime(new Date()), 60 * 1000); // Update every minute
        return () => clearInterval(timer); // Cleanup timer
    }
  }, [isClient]);

  // Fetch appointments when selectedDate changes (and is not null)
  const fetchAndSetAppointments = React.useCallback(() => {
     if (!isClient || !selectedDate) {
        setIsLoading(true); // Set loading if not client or no date selected
        setAppointments([]);
        return;
     }
      setIsLoading(true);
       try {
           const appointmentsForDate = getBarberAppointmentsForDate(selectedDate);
           console.log("Fetched appointments for selected date:", appointmentsForDate);
           setAppointments(appointmentsForDate);
       } catch (error) {
           console.error("Failed to fetch appointments:", error);
           setAppointments([]);
       } finally {
          setIsLoading(false);
       }
  }, [selectedDate, isClient]);

   React.useEffect(() => {
    if (isClient) {
        fetchAndSetAppointments();
    }
   }, [fetchAndSetAppointments, isClient]);

    // Add listener for storage changes to update the view
    React.useEffect(() => {
        if (!isClient) return;

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'barberEaseClientAppointments' || event.key === null) {
                console.log("Storage changed, refetching appointments for barber view...");
                fetchAndSetAppointments();
            }
        };
         const handleAppointmentBooked = () => {
            console.log("Custom 'appointmentbooked' event received, refetching...");
            fetchAndSetAppointments();
        }
         const handleAppointmentStatusChanged = () => {
            console.log("Custom 'appointmentstatuschanged' event received, refetching for calendar view...");
            fetchAndSetAppointments();
        };


        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('appointmentbooked', handleAppointmentBooked);
        window.addEventListener('appointmentstatuschanged', handleAppointmentStatusChanged);


        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('appointmentbooked', handleAppointmentBooked);
            window.removeEventListener('appointmentstatuschanged', handleAppointmentStatusChanged);
        };
    }, [fetchAndSetAppointments, isClient]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(startOfDay(date));
    } else {
      setSelectedDate(null);
    }
  };

   const handleStatusChange = (appointmentId: string, status: 'completed' | 'cancelled' | 'noShow') => {
      if (!isClient) return;
      try {
         const allAppointments = getClientAppointments();
         const updatedAppointments = allAppointments.map(app =>
            app.id === appointmentId ? { ...app, status: status } : app
         );
         saveClientAppointments(updatedAppointments);
          // Re-fetch and filter for the current date to update the UI correctly
         if (selectedDate) {
            const appointmentsForDate = updatedAppointments.filter(app => isSameDay(app.date, selectedDate))
             .sort((a, b) => {
                const timeAStr = a.time || '00:00';
                const timeBStr = b.time || '00:00';
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                const timeA = parse(timeAStr, 'HH:mm', dateA);
                const timeB = parse(timeBStr, 'HH:mm', dateB);
                return timeA.getTime() - timeB.getTime();
             });
            setAppointments(appointmentsForDate);
         }

         toast({
            title: `Cita ${status === 'completed' ? 'completada' : status === 'cancelled' ? 'cancelada' : 'marcada como no presentado'}`,
            description: `Estado de la cita actualizado a ${status}.`,
         });
         // Dispatch an event to notify other components (e.g., AccountingPanel)
         window.dispatchEvent(new CustomEvent('appointmentstatuschanged', { detail: { appointmentId, status } }));
      } catch (error) {
         console.error("Error actualizando estado de la cita:", error);
         toast({
            title: "Actualización Fallida",
            description: "No se pudo actualizar el estado de la cita. Inténtalo de nuevo.",
            variant: "destructive",
         });
      }
   };

    const getStatusBadgeVariant = (status?: 'completed' | 'cancelled' | 'noShow'): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'completed':
                return 'default'; // Typically green or primary
            case 'cancelled':
                return 'destructive';
            case 'noShow':
                return 'secondary'; // Typically gray or less prominent
            default:
                return 'outline'; // For pending/booked status
        }
    };

     const getStatusIcon = (status?: 'completed' | 'cancelled' | 'noShow') => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-red-600" />;
            case 'noShow':
                return <UserX className="h-4 w-4 text-gray-500" />;
            default:
                return null; // For 'booked' or undefined status, no icon or a default one
        }
    };


  if (!isClient || !selectedDate || !currentClientTime || isLoading || appointments === null) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Seleccionar Fecha</CardTitle>
            <CardDescription>Elige una fecha para ver las citas.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-start pt-0 flex-grow">
             {!selectedDate && isClient ? <Skeleton className="w-[280px] h-[330px]" /> : <Calendar mode="single" selected={selectedDate} disabled className="p-0"/> }
             {!isClient && <Skeleton className="w-[280px] h-[330px]" /> } {/* Skeleton for SSR */}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
             <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="flex-grow flex flex-col min-h-0">
             <div className="space-y-4 pt-2">
               <Skeleton className="h-24 w-full rounded-lg" />
               <Skeleton className="h-24 w-full rounded-lg" />
               <Skeleton className="h-24 w-full rounded-lg" />
             </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <Card className="lg:col-span-1 flex flex-col">
         <CardHeader>
           <CardTitle>Seleccionar Fecha</CardTitle>
           <CardDescription>Elige una fecha para ver las citas.</CardDescription>
         </CardHeader>
        <CardContent className="flex justify-center items-start pt-0 flex-grow">
           <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="p-0"
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle>Citas para {format(selectedDate, 'PPP')}</CardTitle>
          <CardDescription>Detalles de citas agendadas para la fecha seleccionada.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0">
          <ScrollArea className="flex-grow pr-4 -mr-4">
            {appointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No hay citas agendadas para esta fecha.</p>
            ) : (
              <ul className="space-y-4">
                {appointments.map((app, index) => {
                   const appointmentTime = parse(app.time || '00:00', 'HH:mm', selectedDate);
                   const isPast = currentClientTime ? isBefore(appointmentTime, currentClientTime) : false;
                   const isCombo = app.bookedItem.type === 'combo';
                   const statusIcon = getStatusIcon(app.status);

                  return (
                  <React.Fragment key={app.id}>
                    <li className={cn(
                        "p-4 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                        isPast && !app.status ? 'bg-muted/50 opacity-70' : 'bg-card', // Dim past, non-statused (booked) appointments
                        app.status === 'completed' && isPast ? 'bg-green-500/10 border-green-500/30' : '', // Style for completed past
                        app.status === 'completed' && !isPast ? 'border-green-500/30' : '', // Style for completed future (less prominent)
                        app.status === 'cancelled' && 'border-destructive/50 bg-destructive/10',
                        app.status === 'noShow' && 'border-muted-foreground/50 bg-muted/30 opacity-80'
                     )}>
                       <div className="space-y-1 flex-grow">
                           <div className="flex items-center gap-2">
                             <User className="h-4 w-4 text-muted-foreground" />
                             <span className="font-semibold">{app.clientName ?? 'Cliente Desconocido'}</span>
                              {statusIcon && <span className="ml-1">{statusIcon}</span>}
                             {isPast && !app.status && <Badge variant="outline">Pasada</Badge>}
                               <Badge variant={getStatusBadgeVariant(app.status)} className="ml-auto sm:ml-2">
                                   {app.status === 'completed' ? 'Completada' :
                                    app.status === 'cancelled' ? 'Cancelada' :
                                    app.status === 'noShow' ? 'No Presentado' :
                                    'Agendada'}
                               </Badge>
                           </div>
                           <div className="flex items-center text-sm text-muted-foreground gap-2">
                             {isCombo ? <Star className="h-4 w-4 text-primary" /> : <Scissors className="h-4 w-4" />}
                             <span>{app.bookedItem.name} ({formatCurrency(app.bookedItem.price)})</span>
                           </div>
                           <div className="flex items-center text-sm text-muted-foreground gap-2">
                             <Clock className="h-4 w-4" />
                             <span>{formatTime(app.time)} ({app.bookedItem.duration} min)</span>
                           </div>
                         </div>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="outline" size="sm" className="w-full sm:w-auto shrink-0">
                                    Actualizar Estado
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'completed')} disabled={app.status === 'completed'}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Completada
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'cancelled')} disabled={app.status === 'cancelled'}>
                                    <XCircle className="mr-2 h-4 w-4" /> Cancelada
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'noShow')} disabled={app.status === 'noShow'}>
                                    <UserX className="mr-2 h-4 w-4" /> No se presentó
                                 </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                    </li>
                    {index < appointments.length - 1 && <Separator className="my-4" />}
                  </React.Fragment>
                   );
                  })}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

