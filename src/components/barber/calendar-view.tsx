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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

  // Set initial date and client time on mount (client-side only)
  React.useEffect(() => {
    setSelectedDate(startOfDay(new Date()));
    setCurrentClientTime(new Date());
     // Timer to update current time periodically for isPast check (optional)
     const timer = setInterval(() => setCurrentClientTime(new Date()), 60 * 1000); // Update every minute
     return () => clearInterval(timer); // Cleanup timer
  }, []);

  // Fetch appointments when selectedDate changes (and is not null)
  const fetchAndSetAppointments = React.useCallback(() => {
     if (selectedDate) {
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
    } else {
      setIsLoading(true);
      setAppointments([]);
    }
  }, [selectedDate]);

   React.useEffect(() => {
      fetchAndSetAppointments();
   }, [fetchAndSetAppointments]);

    // Add listener for storage changes to update the view
    React.useEffect(() => {
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

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('appointmentbooked', handleAppointmentBooked);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('appointmentbooked', handleAppointmentBooked);
        };
    }, [fetchAndSetAppointments]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(startOfDay(date));
    } else {
      setSelectedDate(null);
    }
  };

   const handleStatusChange = (appointmentId: string, status: 'completed' | 'cancelled' | 'noShow') => {
      try {
         const allAppointments = getClientAppointments();
         const updatedAppointments = allAppointments.map(app =>
            app.id === appointmentId ? { ...app, status: status } : app
         );
         saveClientAppointments(updatedAppointments);
         setAppointments(updatedAppointments.filter(app => isSameDay(app.date, selectedDate)));
         toast({
            title: `Appointment ${status}`,
            description: `Appointment status updated to ${status}.`,
         });
      } catch (error) {
         console.error("Error updating appointment status:", error);
         toast({
            title: "Update Failed",
            description: "Could not update appointment status. Please try again.",
            variant: "destructive",
         });
      }
   };

  if (!selectedDate || !currentClientTime || isLoading || appointments === null) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose a date to view appointments.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-start pt-0 flex-grow">
             {!selectedDate ? <Skeleton className="w-[280px] h-[330px]" /> : <Calendar mode="single" selected={selectedDate} disabled className="p-0"/> }
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
             <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="flex-grow flex flex-col min-h-0">
             <div className="space-y-4 pt-2">
               <Skeleton className="h-20 w-full rounded-lg" />
               <Skeleton className="h-20 w-full rounded-lg" />
               <Skeleton className="h-20 w-full rounded-lg" />
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
           <CardTitle>Select Date</CardTitle>
           <CardDescription>Choose a date to view appointments.</CardDescription>
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
          <CardTitle>Appointments for {format(selectedDate, 'PPP')}</CardTitle>
          <CardDescription>Details of scheduled appointments for the selected date.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0">
          <ScrollArea className="flex-grow pr-4 -mr-4">
            {appointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No appointments scheduled for this date.</p>
            ) : (
              <ul className="space-y-4">
                {appointments.map((app, index) => {
                   const appointmentTime = parse(app.time || '00:00', 'HH:mm', selectedDate);
                   const isPast = isBefore(appointmentTime, currentClientTime);
                   const isCombo = app.bookedItem.type === 'combo';

                  return (
                  <React.Fragment key={app.id}>
                    <li className={`p-4 rounded-lg border ${isPast ? 'bg-muted/50 opacity-70' : 'bg-card'}`}>
                       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="space-y-1 flex-grow">
                           <div className="flex items-center gap-2">
                             <User className="h-4 w-4 text-muted-foreground" />
                             <span className="font-semibold">{app.clientName ?? 'Unknown Client'}</span>
                             {isPast && <Badge variant="outline">Past</Badge>}
                           </div>
                           <div className="flex items-center text-sm text-muted-foreground gap-2">
                             {/* Icon based on type */}
                             {isCombo ? <Star className="h-4 w-4 text-primary" /> : <Scissors className="h-4 w-4" />}
                             {/* Use bookedItem details */}
                             <span>{app.bookedItem.name} (${app.bookedItem.price.toFixed(2)})</span>
                           </div>
                           <div className="flex items-center text-sm text-muted-foreground gap-2">
                             <Clock className="h-4 w-4" />
                             <span>{formatTime(app.time)} ({app.bookedItem.duration} min)</span>
                           </div>
                         </div>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="outline" size="sm">
                                    Update Status
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'completed')}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Completed
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'cancelled')}>
                                    <XCircle className="mr-2 h-4 w-4" /> Cancelled
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'noShow')}>
                                    <UserX className="mr-2 h-4 w-4" /> No Show
                                 </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                       </div>
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
