
"use client";

import * as React from 'react';
import { differenceInMinutes, format, parse, isSameDay, startOfDay, addHours, isAfter } from 'date-fns';
import { Bell, Clock, CalendarCheck2, Star, Scissors, Send } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface NotificationsPanelProps {
  barberId: string;
}

export function NotificationsPanel({ barberId }: NotificationsPanelProps) {
  const [allAppointments, setAllAppointments] = React.useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = React.useState<Appointment[]>([]);
  const [dailyAppointments, setDailyAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);
  const [isClient, setIsClient] = React.useState(false);
  const { toast } = useToast();
  const [isSWRegistered, setIsSWRegistered] = React.useState(false);
  const [isTestingNotification, setIsTestingNotification] = React.useState(false);


  React.useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (isClient && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          setIsSWRegistered(true);
          toast({
            title: "Service Worker Registrado",
            description: "Listo para notificaciones push (si se otorgan permisos).",
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
          toast({
            title: "Error de Service Worker",
            description: "No se pudo registrar el service worker para notificaciones.",
            variant: "destructive",
          });
        });
    }
  }, [isClient, toast]);


   const fetchAndFilterAppointments = React.useCallback(() => {
    if (currentTime && isClient) {
        setIsLoading(true);
        try {
            const appointmentsFromStorage = getClientAppointments();
            setAllAppointments(appointmentsFromStorage);

            const upcoming = appointmentsFromStorage
                .map(app => ({ ...app, dateTime: parse(app.time, 'HH:mm', app.date) }))
                .filter(app => {
                    const diff = differenceInMinutes(app.dateTime, currentTime);
                    return isAfter(app.dateTime, currentTime) && diff <= 60;
                })
                 .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
            setUpcomingAppointments(upcoming);

            const todayStart = startOfDay(currentTime);
             const daily = appointmentsFromStorage
                 .map(app => ({ ...app, dateTime: parse(app.time, 'HH:mm', app.date) }))
                 .filter(app => isSameDay(app.date, todayStart) && isAfter(app.dateTime, currentTime))
                 .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
            setDailyAppointments(daily);

        } catch (error) {
            console.error("Failed to fetch appointments for notifications:", error);
            setAllAppointments([]);
            setUpcomingAppointments([]);
            setDailyAppointments([]);
        } finally {
          setIsLoading(false);
        }
    } else if (isClient) { // Ensure loading state is managed if currentTime is not set but isClient is true
       setIsLoading(true);
       setUpcomingAppointments([]);
       setDailyAppointments([]);
    }
  }, [currentTime, isClient]); // Added isClient dependency

  React.useEffect(() => {
     if(isClient) fetchAndFilterAppointments();
  }, [fetchAndFilterAppointments, isClient]);

   React.useEffect(() => {
        if (!isClient) return;

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'barberEaseClientAppointments' || event.key === null) {
                fetchAndFilterAppointments();
            }
        };
        const handleAppointmentBooked = () => {
            fetchAndFilterAppointments();
        }

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('appointmentbooked', handleAppointmentBooked);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('appointmentbooked', handleAppointmentBooked);
        };
    }, [fetchAndFilterAppointments, isClient]);

  const handleTestPushNotification = async () => {
    if (!isClient) return;
    setIsTestingNotification(true);

    if (!('Notification' in window)) {
      toast({
        title: "Navegador no Soportado",
        description: "Este navegador no soporta notificaciones de escritorio.",
        variant: "destructive",
      });
      setIsTestingNotification(false);
      return;
    }

    if (!isSWRegistered || !navigator.serviceWorker.controller) {
        toast({
            title: "Service Worker no Listo",
            description: "El Service Worker aún no está listo o no está controlando la página. Intenta de nuevo en unos momentos o recarga la página.",
            variant: "warning",
        });
        setIsTestingNotification(false);
        return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Permiso Concedido",
          description: "Prueba de notificación programada. Deberías recibirla en 5 segundos.",
        });

        setTimeout(() => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_TEST_NOTIFICATION',
              message: '¡Tienes una nueva cita agendada! Revisa tu calendario.',
            });
          } else {
             console.warn("Service Worker controller not available at time of sending message.");
             new Notification('Notificación de Prueba (Fallback Directo)', {
                body: '¡Nueva cita agendada! (SW controller no encontrado)',
             });
             toast({
                title: "Advertencia de Notificación",
                description: "Notificación enviada directamente, el Service Worker no estaba activo para el envío.",
                variant: "warning"
             });
          }
          setIsTestingNotification(false);
        }, 5000); // 5 seconds

      } else if (permission === 'denied') {
        toast({
            title: "Permiso Denegado",
            description: "Has denegado el permiso para notificaciones. Por favor, habilítalo en la configuración de tu navegador para este sitio si deseas recibirlas.",
            variant: "destructive",
        });
        setIsTestingNotification(false);
      } else { // permission === 'default'
        toast({
            title: "Permiso Requerido",
            description: "No se concedió permiso para mostrar notificaciones. Por favor, responde al aviso del navegador o revisa la configuración de tu sitio.",
            variant: "warning",
        });
        setIsTestingNotification(false);
      }
    } catch (error) {
      console.error("Error requesting notification permission or sending test notification:", error);
      toast({
        title: "Error de Notificación",
        description: "Ocurrió un error al intentar enviar la notificación de prueba.",
        variant: "destructive",
      });
      setIsTestingNotification(false);
    }
  };


  const renderAppointmentItem = (app: Appointment, isUpcoming: boolean = false) => {
     if (!currentTime) return null;

     const appDateTime = parse(app.time, 'HH:mm', app.date);
     const minutesUntil = differenceInMinutes(appDateTime, currentTime);
     const timeFormatted = formatTime(app.time);
     const isCombo = app.bookedItem.type === 'combo';

    if (!isUpcoming && minutesUntil < 0 && !isSameDay(appDateTime, currentTime) ) return null; //Also show past items for today

    return (
       <li key={app.id} className="flex items-start gap-4 p-3 rounded-md border bg-card">
        <div className={`mt-1 p-1.5 rounded-full ${isUpcoming && minutesUntil <= 15 && minutesUntil >=0 ? 'bg-accent/20 animate-pulse' : 'bg-primary/10'}`}>
          {isUpcoming ? <Bell className="h-4 w-4 text-accent" /> : <CalendarCheck2 className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-grow space-y-0.5">
          <p className="font-medium flex items-center gap-1.5">
             {isCombo ? <Star className="h-4 w-4 text-primary" /> : <Scissors className="h-4 w-4 text-muted-foreground" />}
             {app.clientName ?? 'Cliente desconocido'} - {app.bookedItem.name}
          </p>
          <div className="flex items-center text-sm text-muted-foreground gap-2">
             <Clock className="h-3.5 w-3.5" />
             <span>{timeFormatted}</span>
              {isUpcoming && minutesUntil >= 0 && (
               <Badge variant={minutesUntil <= 15 ? "destructive" : "secondary"}>
                 en {minutesUntil} min
               </Badge>
             )}
             {isUpcoming && minutesUntil < 0 && ( // For items in the last hour that just passed
                <Badge variant="outline">Hace {-minutesUntil} min</Badge>
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

  if (!isClient || isLoading || !currentTime) { // Added !isClient check for skeleton
     return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <Card className="flex flex-col">
                <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="text-accent h-5 w-5" />Próximas citas</CardTitle>
                <CardDescription>Citas que comienzan en la próxima hora.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col min-h-0">
                {renderSkeleton(2)}
                </CardContent>
            </Card>
            <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarCheck2 className="text-primary h-5 w-5" />Agenda de hoy</CardTitle>
                <CardDescription>Citas restantes para hoy.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col min-h-0">
                {renderSkeleton(4)}
            </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Probar Notificaciones Push</CardTitle>
                <CardDescription>
                Haz clic en el botón para probar si las notificaciones push funcionan en tu navegador y dispositivo.
                Recibirás una notificación en 5 segundos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-48" />
                 <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
        </Card>
      </div>
    );
   }

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
        <Card className="flex flex-col">
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="text-accent h-5 w-5" />Próximas citas</CardTitle>
            <CardDescription>Citas que comienzan en la próxima hora.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col min-h-0">
            <ScrollArea className="flex-grow pr-3 -mr-3">
                {upcomingAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay citas próximas.</p>
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
            <CardTitle className="flex items-center gap-2"><CalendarCheck2 className="text-primary h-5 w-5" />Agenda de hoy</CardTitle>
            <CardDescription>Citas restantes para hoy.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col min-h-0">
            <ScrollArea className="flex-grow pr-3 -mr-3">
                {dailyAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay más citas programadas para hoy.</p>
                ) : (
                <ul className="space-y-3">
                    {dailyAppointments.map(app => renderAppointmentItem(app, false))}
                </ul>
                )}
            </ScrollArea>
            </CardContent>
        </Card>
        </div>
        <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Probar Notificaciones Push</CardTitle>
            <CardDescription>
            Haz clic en el botón para probar si las notificaciones push funcionan.
            Recibirás una notificación en 5 segundos. Asegúrate de haber otorgado permisos.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleTestPushNotification} disabled={!isClient || !isSWRegistered || isTestingNotification}>
            {isTestingNotification ? 'Enviando prueba...' : 'Probar Notificación Push'}
            </Button>
            {!isClient && <p className="text-sm text-muted-foreground mt-2">Cargando...</p>}
            {isClient && !isSWRegistered && <p className="text-sm text-muted-foreground mt-2">Registrando Service Worker para notificaciones...</p>}
            {isClient && isSWRegistered && !('Notification' in window) && <p className="text-sm text-destructive mt-2">Este navegador no soporta notificaciones.</p>}
        </CardContent>
        </Card>
    </div>
  );
}

