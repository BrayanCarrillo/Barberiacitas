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
import { getClientAppointments } from '@/lib/storage'; // Import function to get appointments from storage
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Clock, User, Scissors } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { formatTime } from '@/lib/date-utils'; // Import formatTime utility

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
        const timeA = parse(timeAStr, 'HH:mm', new Date());
        const timeB = parse(timeBStr, 'HH:mm', new Date());
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

  // Set initial date and client time on mount (client-side only)
  React.useEffect(() => {
    setSelectedDate(startOfDay(new Date()));
    setCurrentClientTime(new Date());
  }, []);

  // Fetch appointments when selectedDate changes (and is not null)
  const fetchAndSetAppointments = React.useCallback(() => {
     if (selectedDate) {
      setIsLoading(true);
       try {
           // Directly use the function that reads from localStorage
           const appointmentsForDate = getBarberAppointmentsForDate(selectedDate);
           setAppointments(appointmentsForDate);
       } catch (error) {
           console.error("Failed to fetch appointments:", error);
           setAppointments([]); // Set empty on error
           // Optionally, show a toast message here
       } finally {
          setIsLoading(false);
       }
    } else {
      // If selectedDate is null (initial state), don't fetch, ensure loading is true
      setIsLoading(true);
      setAppointments([]);
    }
  }, [selectedDate]);

   React.useEffect(() => {
      fetchAndSetAppointments();
   }, [fetchAndSetAppointments]);

    // Add listener for storage changes to update the view when a new appointment is booked/cancelled
    React.useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'barberEaseClientAppointments' || event.key === null) { // Listen to our key or general storage changes
                console.log("Storage changed, refetching appointments for barber view...");
                fetchAndSetAppointments();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Also listen for custom event dispatched from client booking
        const handleAppointmentBooked = () => {
            console.log("Custom 'appointmentbooked' event received, refetching...");
            fetchAndSetAppointments();
        }
         window.addEventListener('appointmentbooked', handleAppointmentBooked);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('appointmentbooked', handleAppointmentBooked);
        };
    }, [fetchAndSetAppointments]); // Depend on the fetching function

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(startOfDay(date));
    } else {
      setSelectedDate(null);
    }
  };

  // Show skeleton while initial date/time is being set or appointments are loading
   // Include appointments === null check for initial load before first fetch attempt
  if (!selectedDate || !currentClientTime || isLoading || appointments === null) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose a date to view appointments.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-start pt-0 flex-grow">
            {/* Only render Calendar skeleton if selectedDate is not yet set */}
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
            // Potentially highlight dates with appointments
            // modifiers={{ booked: datesWithAppointments }}
            // modifiersClassNames={{ booked: "bg-primary/10 rounded-full" }}
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
                             <Scissors className="h-4 w-4" />
                             <span>{app.service.name} (${app.service.price})</span>
                           </div>
                           <div className="flex items-center text-sm text-muted-foreground gap-2">
                             <Clock className="h-4 w-4" />
                              {/* Use formatTime utility */}
                             <span>{formatTime(app.time)} ({app.service.duration} min)</span>
                           </div>
                         </div>
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
