"use client";

import * as React from 'react';
import { differenceInMinutes, format, parse, isSameDay, startOfDay, addHours, isAfter } from 'date-fns';
import { Bell, Clock, CalendarCheck2 } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { getClientAppointments } from '@/lib/storage'; // Import getClientAppointments from storage
import { formatTime } from '@/lib/date-utils'; // Import formatTime utility

interface NotificationsPanelProps {
  barberId: string;
}

export function NotificationsPanel({ barberId }: NotificationsPanelProps) {
  const [allAppointments, setAllAppointments] = React.useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = React.useState<Appointment[]>([]);
  const [dailyAppointments, setDailyAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null); // Initialize with null

   // Effect to set initial time and start interval on client side
   React.useEffect(() => {
    setCurrentTime(new Date()); // Set initial time
    const timer = setInterval(() => {
      setCurrentTime(new Date()); // Update time every minute
    }, 60000);
    return () => clearInterval(timer); // Cleanup interval on unmount
  }, []);

  // Effect to fetch and filter appointments
  React.useEffect(() => {
    // Only run if currentTime is set (i.e., after hydration)
    if (currentTime) {
        setIsLoading(true);
        try {
            // Directly fetch appointments from local storage
            const appointmentsFromStorage = getClientAppointments();
            setAllAppointments(appointmentsFromStorage); // Store all fetched appointments

            // Filter for upcoming (within the next hour from currentTime)
            const upcoming = appointmentsFromStorage.filter(app => {
              const appDateTime = parse(app.time, 'HH:mm', app.date);
              const diff = differenceInMinutes(appDateTime, currentTime);
              return isAfter(appDateTime, currentTime) && diff <= 60; // Ensure it's in the future
            });
            setUpcomingAppointments(upcoming);

            // Filter for today's remaining appointments from currentTime
            const todayStart = startOfDay(currentTime);
            const daily = appointmentsFromStorage.filter(app =>
              isSameDay(app.date, todayStart) &&
              isAfter(parse(app.time, 'HH:mm', app.date), currentTime) // Only future appointments today
            );
            setDailyAppointments(daily);

        } catch (error) {
            console.error("Failed to fetch appointments for notifications:", error);
            setAllAppointments([]);
            setUpcomingAppointments([]);
            setDailyAppointments([]);
        }
         finally {
          setIsLoading(false);
        }
    } else {
      // If currentTime is null (before hydration), keep loading true
       setIsLoading(true);
       setUpcomingAppointments([]);
       setDailyAppointments([]);
    }
  }, [barberId, currentTime]); // Rerun when currentTime updates

  const renderAppointmentItem = (app: Appointment, isUpcoming: boolean = false) => {
     if (!currentTime) return null; // Don't render if currentTime is not set yet

     const appDateTime = parse(app.time, 'HH:mm', app.date);
     const minutesUntil = differenceInMinutes(appDateTime, currentTime); // Use state for current time
     const timeFormatted = format(appDateTime, 'p');

    // Si hay textos visibles en la UI, tradúcelos aquí. Si no, los mocks ya están traducidos.

    // This check might be redundant due to filtering but ensures consistency
    if (minutesUntil < 0 && !isUpcoming) return null; // Don't render past daily appointments

    return (
       <li key={app.id} className="flex items-start gap-4 p-3 rounded-md border bg-card">
        <div className={`mt-1 p-1.5 rounded-full ${isUpcoming && minutesUntil <= 15 ? 'bg-accent/20 animate-pulse' : 'bg-primary/10'}`}>
          {isUpcoming ? <Bell className="h-4 w-4 text-accent" /> : <CalendarCheck2 className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-grow space-y-0.5">
          <p className="font-medium">{app.clientName ?? 'Unknown Client'} - {app.service.name}</p>
          <div className="flex items-center text-sm text-muted-foreground gap-2">
             <Clock className="h-3.5 w-3.5" />
             <span>{timeFormatted}</span>
              {isUpcoming && minutesUntil >= 0 && ( // Only show badge for future upcoming
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

   // Show skeleton if loading or if currentTime is not yet available
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
          <ScrollArea className="flex-grow pr-3 -mr-3"> {/* Adjust padding */}
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
          <ScrollArea className="flex-grow pr-3 -mr-3"> {/* Adjust padding */}
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
