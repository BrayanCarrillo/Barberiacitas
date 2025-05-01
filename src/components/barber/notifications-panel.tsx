"use client";

import * as React from 'react';
import { differenceInMinutes, format, parse, isSameDay, startOfDay, addHours } from 'date-fns';
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

// Mock function to get ALL appointments for the barber (replace with API call)
// In a real app, you might fetch appointments for today and maybe tomorrow
async function getAllBarberAppointments(barberId: string): Promise<Appointment[]> {
  console.log(`Fetching all appointments for barber ${barberId}`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addHours(today, 24)); // Correctly get start of tomorrow

  // Mock Data
  return [
     { id: 'n_app1', clientName: 'Gael Miller', service: { id: 'haircut', name: 'Haircut', duration: 30, price: 25 }, date: today, time: format(addHours(new Date(), 0.5), 'HH:mm') }, // Upcoming soon
     { id: 'n_app2', clientName: 'Pedro Wilson', service: { id: 'beard_trim', name: 'Beard Trim', duration: 20, price: 15 }, date: today, time: format(addHours(new Date(), 2), 'HH:mm') }, // Today later
     { id: 'n_app3', clientName: 'Ivan Taylor', service: { id: 'haircut_beard', name: 'Haircut & Beard Trim', duration: 50, price: 35 }, date: today, time: format(addHours(new Date(), 4), 'HH:mm') }, // Today much later
     { id: 'n_app4', clientName: 'Juan Anderson', service: { id: 'shave', name: 'Hot Towel Shave', duration: 40, price: 30 }, date: tomorrow, time: '10:00' }, // Tomorrow
     { id: 'n_app5', clientName: 'Diego Garcia', service: { id: 'haircut', name: 'Haircut', duration: 30, price: 25 }, date: today, time: format(addHours(new Date(), -1), 'HH:mm') }, // Past today
     { id: 'n_app6', clientName: 'Jose Hernandez', service: { id: 'haircut', name: 'Haircut', duration: 30, price: 25 }, date: today, time: format(addHours(new Date(), 0.1), 'HH:mm') }, // Very Soon
  ].sort((a, b) => {
      const dateTimeA = parse(a.time, 'HH:mm', a.date);
      const dateTimeB = parse(b.time, 'HH:mm', b.date);
      return dateTimeA.getTime() - dateTimeB.getTime();
    });
}


interface NotificationsPanelProps {
  barberId: string;
}

export function NotificationsPanel({ barberId }: NotificationsPanelProps) {
  const [upcomingAppointments, setUpcomingAppointments] = React.useState<Appointment[]>([]);
  const [dailyAppointments, setDailyAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
     const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update time every minute

     setIsLoading(true);
    getAllBarberAppointments(barberId)
      .then(allAppointments => {
        const now = new Date(); // Use consistent 'now' for filtering

        // Filter for upcoming (within the next hour)
        const upcoming = allAppointments.filter(app => {
          const appDateTime = parse(app.time, 'HH:mm', app.date);
          const diff = differenceInMinutes(appDateTime, now);
          return diff >= 0 && diff <= 60;
        });
        setUpcomingAppointments(upcoming);

        // Filter for today's remaining appointments
        const today = startOfDay(now);
        const daily = allAppointments.filter(app =>
          isSameDay(app.date, today) &&
          differenceInMinutes(parse(app.time, 'HH:mm', app.date), now) >= 0 // Only future appointments today
        );
        setDailyAppointments(daily);
      })
       .catch(error => console.error("Failed to fetch appointments for notifications:", error))
      .finally(() => setIsLoading(false));

       return () => clearInterval(timer); // Cleanup interval on unmount
  }, [barberId]); // Rerun effect when barberId changes (or time updates if needed, but useEffect deps manage this)


  const renderAppointmentItem = (app: Appointment, isUpcoming: boolean = false) => {
     const appDateTime = parse(app.time, 'HH:mm', app.date);
     const minutesUntil = differenceInMinutes(appDateTime, currentTime); // Use state for current time
     const timeFormatted = format(appDateTime, 'p');

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


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="text-accent h-5 w-5" />Upcoming Appointments</CardTitle>
          <CardDescription>Appointments starting within the next hour.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0">
          <ScrollArea className="flex-grow pr-3 -mr-3"> {/* Adjust padding */}
             {isLoading ? renderSkeleton(2) : upcomingAppointments.length === 0 ? (
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
            {isLoading ? renderSkeleton(4) : dailyAppointments.length === 0 ? (
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
