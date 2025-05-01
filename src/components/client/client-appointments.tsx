"use client";

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Trash2 } from 'lucide-react';
import { getClientAppointments, removeClientAppointment } from '@/lib/storage';
import type { Appointment } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

export function ClientAppointments() {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const { toast } = useToast();

  const fetchAppointments = React.useCallback(() => {
    const storedAppointments = getClientAppointments();
    // Sort appointments by date and time
    const sortedAppointments = storedAppointments.sort((a, b) => {
      const dateA = new Date(a.date);
      dateA.setHours(parseInt(a.time.split(':')[0], 10), parseInt(a.time.split(':')[1], 10));
      const dateB = new Date(b.date);
      dateB.setHours(parseInt(b.time.split(':')[0], 10), parseInt(b.time.split(':')[1], 10));
      return dateA.getTime() - dateB.getTime();
    });
    setAppointments(sortedAppointments);
  }, []);

  React.useEffect(() => {
    fetchAppointments();
    // Listen for storage changes (e.g., when a new appointment is added)
    const handleStorageChange = () => {
      fetchAppointments();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchAppointments]);

  const handleCancelAppointment = (appointmentId: string) => {
     try {
      removeClientAppointment(appointmentId);
      fetchAppointments(); // Refresh the list
      toast({
        title: 'Appointment Cancelled',
        description: 'Your appointment has been successfully cancelled.',
      });
    } catch (error) {
       toast({
        title: "Cancellation Failed",
        description: "Could not cancel the appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Appointments</CardTitle>
        <CardDescription>View your upcoming scheduled appointments.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {appointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">You have no upcoming appointments.</p>
          ) : (
            <ul className="space-y-4">
              {appointments.map((app, index) => (
                <React.Fragment key={app.id}>
                  <li className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                     <div className="space-y-1 flex-grow">
                       <p className="font-semibold">{app.service.name}</p>
                       <div className="flex items-center text-sm text-muted-foreground gap-2">
                         <Calendar className="h-4 w-4" />
                         <span>{format(app.date, 'EEE, MMM d, yyyy')}</span>
                       </div>
                       <div className="flex items-center text-sm text-muted-foreground gap-2">
                         <Clock className="h-4 w-4" />
                         <span>{format(new Date(`1970-01-01T${app.time}`), 'p')}</span>
                       </div>
                      <p className="text-sm text-muted-foreground">Price: ${app.service.price}</p>
                     </div>
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                           <Trash2 className="h-4 w-4 mr-2" />
                           Cancel
                         </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                           <AlertDialogDescription>
                             This action cannot be undone. This will permanently cancel your appointment for {app.service.name} on {format(app.date, 'PPP')} at {format(new Date(`1970-01-01T${app.time}`), 'p')}.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                           <AlertDialogAction onClick={() => handleCancelAppointment(app.id)}>
                             Yes, Cancel It
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                  </li>
                  {index < appointments.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
