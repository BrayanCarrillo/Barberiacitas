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
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { formatTime } from '@/lib/date-utils'; // Import formatTime

export function ClientAppointments() {
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null); // Initialize with null
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  const fetchAppointments = React.useCallback(() => {
    setIsLoading(true);
    try {
        const storedAppointments = getClientAppointments();
        // Sort appointments by date and time
        const sortedAppointments = storedAppointments.sort((a, b) => {
          const dateA = new Date(a.date);
          if (a.time) { // Check if time is defined
            const [hoursA, minutesA] = a.time.split(':').map(Number);
            if (!isNaN(hoursA) && !isNaN(minutesA)) {
                dateA.setHours(hoursA, minutesA);
            }
          }

          const dateB = new Date(b.date);
           if (b.time) { // Check if time is defined
             const [hoursB, minutesB] = b.time.split(':').map(Number);
             if (!isNaN(hoursB) && !isNaN(minutesB)) {
                dateB.setHours(hoursB, minutesB);
             }
           }
          return dateA.getTime() - dateB.getTime();
        });
        setAppointments(sortedAppointments);
    } catch (error) {
        console.error("Error fetching appointments:", error);
        setAppointments([]); // Set to empty array on error
         toast({
            title: "Error al cargar citas",
            description: "No se pudieron cargar tus citas guardadas.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  // Fetch appointments on mount (client-side only)
  React.useEffect(() => {
    fetchAppointments();

    // Define the handler for storage changes
    const handleStorageChange = (event: StorageEvent) => {
        // Check if the change happened to our specific key
        if (event.key === 'barberEaseClientAppointments') {
            fetchAppointments();
        }
    };

    // Add event listener
    window.addEventListener('storage', handleStorageChange);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchAppointments]);


  const handleCancelAppointment = (appointmentId: string) => {
     try {
      removeClientAppointment(appointmentId);
      fetchAppointments(); // Refresh the list
      toast({
        title: 'Cita cancelada',
        description: 'Tu cita ha sido cancelada exitosamente.',
      });
    } catch (error) {
       toast({
        title: "Error al cancelar",
        description: "No se pudo cancelar la cita. Por favor intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

   const renderSkeleton = (count = 3) => (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg border">
           <div className="space-y-2 flex-grow">
             <Skeleton className="h-5 w-3/5" />
             <Skeleton className="h-4 w-4/5" />
             <Skeleton className="h-4 w-2/5" />
             <Skeleton className="h-4 w-1/4" />
           </div>
           <Skeleton className="h-9 w-24 mt-2 sm:mt-0" />
        </div>
      ))}
    </div>
  );


  return (
    <Card>
      <CardHeader>
        <CardTitle>Tus citas</CardTitle>
        <CardDescription>Consulta tus próximas citas agendadas.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading || appointments === null ? ( // Show skeleton if loading or appointments are null
            renderSkeleton()
          ) : appointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tienes citas próximas.</p>
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
                          {/* Use formatTime utility */}
                         <span>{formatTime(app.time)}</span>
                       </div>
                      <p className="text-sm text-muted-foreground">Price: ${app.service.price}</p>
                     </div>
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                           <Trash2 className="h-4 w-4 mr-2" />
                           Cancelar
                         </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                           <AlertDialogDescription>
                              {/* Use formatTime utility */}
                             Esta acción no se puede deshacer. Esto cancelará permanentemente tu cita para {app.service.name} el {format(app.date, 'PPP')} a las {formatTime(app.time)}.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Mantener cita</AlertDialogCancel>
                           <AlertDialogAction onClick={() => handleCancelAppointment(app.id)}>
                             Sí, cancelar
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
