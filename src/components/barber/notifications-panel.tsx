
"use client";

import * as React from 'react';
import { differenceInMinutes, format, parse, isSameDay, startOfDay, addHours, isAfter } from 'date-fns';
import { Bell, Clock, CalendarCheck2, Star, Scissors } from 'lucide-react'; // Added Star and Scissors
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Appointment } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getClientAppointments } from '@/lib/storage';
import { formatTime } from '@/lib/date-utils';

interface NotificationsPanelProps {
  barberId: string;
}

export function NotificationsPanel({ barberId }: NotificationsPanelProps) {
  const [allAppointments, setAllAppointments] = React.useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = React.useState<Appointment[]>([]);
  const [dailyAppointments, setDailyAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);

   React.useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

   const fetchAndFilterAppointments = React.useCallback(() => {
    if (currentTime) {
        setIsLoading(true);
        try {
            const appointmentsFromStorage = getClientAppointments();
            setAllAppointments(appointmentsFromStorage);

            // Filter for upcoming (within the next hour from currentTime)
             const upcoming = appointmentsFromStorage
                .map(app => ({ // Calculate dateTime for filtering
                    ...app,
                    dateTime: parse(app.time, 'HH:mm', app.date)
                }))
                .filter(app => {
                    const diff = differenceInMinutes(app.dateTime, currentTime);
                    return isAfter(app.dateTime, currentTime) && diff <= 60;
                })
                 .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()); // Sort upcoming
            setUpcomingAppointments(upcoming);

            // Filter for today's remaining appointments from currentTime
            const todayStart = startOfDay(currentTime);
             const daily = appointmentsFromStorage
                 .map(app => ({ // Calculate dateTime for filtering and sorting
                    ...app,
                    dateTime: parse(app.time, 'HH:mm', app.date)
                 }))
                 .filter(app =>
                    isSameDay(app.date, todayStart) && isAfter(app.dateTime, currentTime)
                 )
                 .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()); // Sort daily remaining
            setDailyAppointments(daily);

        } catch (error) {
            console.error("Failed to fetch appointments for notifications:", error);
            setAllAppointments([]);
            setUpcomingAppointments([]);
            setDailyAppointments([]);
        } finally {
          setIsLoading(false);
        }
    } else {
       setIsLoading(true);
       setUpcomingAppointments([]);
       setDailyAppointments([]);
    }
  }, [barberId, currentTime]);

  // Effect to fetch and filter appointments
  React.useEffect(() => {
     fetchAndFilterAppointments();
  }, [fetchAndFilterAppointments]);

   // Add listener for storage changes
   React.useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'barberEaseClientAppointments' || event.key === null) {
                console.log("Storage changed, refetching notifications...");
                fetchAndFilterAppointments();
            }
        };
        const handleAppointmentBooked = () => {
             console.log("Custom 'appointmentbooked' event received, refetching notifications...");
            fetchAndFilterAppointments();
        }

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('appointmentbooked', handleAppointmentBooked);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('appointmentbooked', handleAppointmentBooked);
        };
    }, [fetchAndFilterAppointments]); // Depend on the fetching function

  const renderAppointmentItem = (app: Appointment, isUpcoming: boolean = false) => {
     if (!currentTime) return null;

     const appDateTime = parse(app.time, 'HH:mm', app.date);
     const minutesUntil = differenceInMinutes(appDateTime, currentTime);
     const timeFormatted = formatTime(app.time); // Use utility
     const isCombo = app.bookedItem.type === 'combo';

    // Don't render past daily appointments (already filtered, but good safeguard)
    if (!isUpcoming && minutesUntil < 0) return null;

    return (
       <li key={app.id} className="flex items-start gap-4 p-3 rounded-md border bg-card">
        <div className={`mt-1 p-1.5 rounded-full ${isUpcoming && minutesUntil <= 15 ? 'bg-accent/20 animate-pulse' : 'bg-primary/10'}`}>
          {isUpcoming ? <Bell className="h-4 w-4 text-accent" /> : <CalendarCheck2 className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-grow space-y-0.5">
          {/* Use bookedItem name */}
          <p className="font-medium flex items-center gap-1.5">
             {isCombo ? <Star className="h-4 w-4 text-primary" /> : <Scissors className="h-4 w-4 text-muted-foreground" />}
             {app.clientName ?? 'Unknown Client'} - {app.bookedItem.name}
          </p>
          <div className="flex items-center text-sm text-muted-foreground gap-2">
             <Clock className="h-3.5 w-3.5" />
             <span>{timeFormatted}</span>
              {isUpcoming && minutesUntil >= 0 && (
               <Badge variant={minutesUntil <= 15 ? "destructive" : "secondary"}>
                 in {minutesUntil} min
               </Badge>
             )}
           </div>
        </div>
      </li>
    );
  };

   const renderSkeleton = (count = 3) => (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-3 rounded-md border">
           <Skeleton className="h-7 w-7 rounded-full mt-1" />
           <div className="flex-grow space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading || !currentTime) {
     return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
         <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="text-accent h-5 w-5" />Upcoming Appointments</CardTitle>
              <CardDescription>Appointments starting within the next hour.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col min-h-0">
              {renderSkeleton(2)}
            </CardContent>
         </Card>
         <Card className="flex flex-col">
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><CalendarCheck2 className="text-primary h-5 w-5" />Today's Schedule</CardTitle>
             <CardDescription>Remaining appointments for today.</CardDescription>
           </CardHeader>
           <CardContent className="flex-grow flex flex-col min-h-0">
             {renderSkeleton(4)}
           </CardContent>
         </Card>
      </div>
    );
   }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="text-accent h-5 w-5" />Upcoming Appointments</CardTitle>
          <CardDescription>Appointments starting within the next hour.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0">
          <ScrollArea className="flex-grow pr-3 -mr-3">
             {upcomingAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No appointments starting soon.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingAppointments.map(app => renderAppointmentItem(app, true))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarCheck2 className="text-primary h-5 w-5" />Today's Schedule</CardTitle>
          <CardDescription>Remaining appointments for today.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0">
          <ScrollArea className="flex-grow pr-3 -mr-3">
            {dailyAppointments.length === 0 ? (
               <p className="text-muted-foreground text-center py-8">No more appointments scheduled for today.</p>
            ) : (
              <ul className="space-y-3">
                {dailyAppointments.map(app => renderAppointmentItem(app, false))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
```