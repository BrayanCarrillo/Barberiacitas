"use client";

import * as React from 'react';
import { format, startOfDay, isSameDay, parse, isAfter, isBefore } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Appointment, Service } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Clock, User, Scissors } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Mock function to get appointments (replace with actual API call)
async function getBarberAppointments(barberId: string, date: Date): Promise<Appointment[]> {
  console.log(`Fetching appointments for barber ${barberId} on ${format(date, 'yyyy-MM-dd')}`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700));

  // Mock Data - In a real app, filter appointments for the specific date
  const mockAppointments: Appointment[] = [
    { id: 'app1', clientName: 'Alice Smith', service: { id: 'haircut', name: 'Haircut', duration: 30, price: 25 }, date: new Date(2024, 6, 25), time: '10:00' },
    { id: 'app2', clientName: 'Bob Johnson', service: { id: 'beard_trim', name: 'Beard Trim', duration: 20, price: 15 }, date: new Date(2024, 6, 25), time: '11:30' },
    { id: 'app3', clientName: 'Charlie Brown', service: { id: 'haircut_beard', name: 'Haircut & Beard Trim', duration: 50, price: 35 }, date: new Date(2024, 6, 26), time: '14:00' },
    { id: 'app4', clientName: 'David Williams', service: { id: 'shave', name: 'Hot Towel Shave', duration: 40, price: 30 }, date: new Date(), time: '09:30' }, // Today
     { id: 'app5', clientName: 'Eve Davis', service: { id: 'haircut', name: 'Haircut', duration: 30, price: 25 }, date: new Date(), time: '15:00' }, // Today
  ];

  return mockAppointments.filter(app => isSameDay(app.date, date))
     .sort((a, b) => {
        // Sort by time
        const timeA = parse(a.time, 'HH:mm', new Date());
        const timeB = parse(b.time, 'HH:mm', new Date());
        return timeA.getTime() - timeB.getTime();
      });
}

interface CalendarViewProps {
  barberId: string;
}

export function CalendarView({ barberId }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(startOfDay(new Date()));
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (selectedDate) {
      setIsLoading(true);
      getBarberAppointments(barberId, selectedDate)
        .then(setAppointments)
        .catch(error => {
          console.error("Failed to fetch appointments:", error);
          // Handle error state, maybe show a toast
        })
        .finally(() => setIsLoading(false));
    }
  }, [selectedDate, barberId]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(startOfDay(date));
    }
  };

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
            className="p-0" // Remove default padding to fit card better
            // Potentially highlight dates with appointments
            // modifiers={{ booked: datesWithAppointments }}
            // modifiersClassNames={{ booked: "bg-primary/10 rounded-full" }}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle>Appointments for {selectedDate ? format(selectedDate, 'PPP') : '...'}</CardTitle>
          <CardDescription>Details of scheduled appointments for the selected date.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col min-h-0">
          <ScrollArea className="flex-grow pr-4 -mr-4"> {/* Added negative margin to compensate padding */}
            {isLoading ? (
               <div className="space-y-4 pt-2">
                 <Skeleton className="h-20 w-full rounded-lg" />
                 <Skeleton className="h-20 w-full rounded-lg" />
                 <Skeleton className="h-20 w-full rounded-lg" />
               </div>
            ) : appointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No appointments scheduled for this date.</p>
            ) : (
              <ul className="space-y-4">
                {appointments.map((app, index) => {
                   const appointmentTime = parse(app.time, 'HH:mm', selectedDate || new Date());
                   const isPast = isBefore(appointmentTime, new Date());

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
                             <span>{format(appointmentTime, 'p')} ({app.service.duration} min)</span>
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
