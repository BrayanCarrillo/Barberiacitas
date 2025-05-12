
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
  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission | null>(null);


  React.useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
    // Initialize notificationPermission state on client mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (isClient && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          setIsSWRegistered(true);
          // No toast here, let user interact first
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
    } else if (isClient) { 
       setIsLoading(true);
       setUpcomingAppointments([]);
       setDailyAppointments([]);
    }
  }, [currentTime, isClient]); 

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

    // Check current permission status
    let currentPermission = Notification.permission;
    setNotificationPermission(currentPermission); // Update UI state

    if (currentPermission === 'granted') {
        // If permission is already granted, send the notification
        new Notification('Notificación de Prueba', {
            body: '¡Esta es una notificación de prueba de BarberEase!',
            icon: '/icon-192x192.png' // Ensure this icon exists in public folder
        });
        toast({
            title: "Notificación Enviada",
            description: "Ya tenías permiso. Se envió una notificación de prueba.",
        });
        setIsTestingNotification(false);
        return;
    }
    
    if (currentPermission === 'denied') {
        toast({
            title: "Permiso Denegado",
            description: "Has denegado previamente el permiso para notificaciones. Por favor, habilítalo en la configuración de tu navegador para este sitio si deseas recibirlas.",
            variant: "destructive",
        });
        setIsTestingNotification(false);
        return;
    }

    // If permission is 'default', request it
    if (currentPermission === 'default') {
        try {
            const permissionResult = await Notification.requestPermission();
            setNotificationPermission(permissionResult); // Update UI state with new permission

            if (permissionResult === 'granted') {
                new Notification('Notificación de Prueba', {
                    body: '¡Permiso concedido! Esta es una notificación de prueba.',
                    icon: '/icon-192x192.png'
                });
                toast({
                    title: "Permiso Concedido",
                    description: "Se envió una notificación de prueba.",
                });
            } else if (permissionResult === 'denied') {
                toast({
                    title: "Permiso Denegado",
                    description: "Has denegado el permiso para notificaciones.",
                    variant: "destructive",
                });
            } else { // default again, user dismissed the prompt
                 toast({
                    title: "Permiso no Concedido",
                    description: "No se otorgó el permiso para notificaciones.",
                    variant: "warning",
                });
            }
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            toast({
                title: "Error de Permiso",
                description: "Ocurrió un error al solicitar el permiso de notificación.",
                variant: "destructive",
            });
        } finally {
            setIsTestingNotification(false);
        }
    }
  };


  const renderAppointmentItem = (app: Appointment, isUpcoming: boolean = false) => {
     if (!currentTime) return null;

     const appDateTime = parse(app.time, 'HH:mm', app.date);
     const minutesUntil = differenceInMinutes(appDateTime, currentTime);
     const timeFormatted = formatTime(app.time);
     const isCombo = app.bookedItem.type === 'combo';

    if (!isUpcoming && minutesUntil < 0 && !isSameDay(appDateTime, currentTime) ) return null; 

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
             {isUpcoming && minutesUntil < 0 && ( 
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

  if (!isClient || isLoading || !currentTime) { 
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
                Haz clic en el botón para solicitar permiso y probar si las notificaciones push funcionan en tu navegador y dispositivo.
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
                {notificationPermission === 'granted' 
                    ? "Ya tienes permisos. Haz clic para enviar una notificación de prueba." 
                    : "Haz clic en el botón para solicitar permiso y probar si las notificaciones push funcionan."
                }
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleTestPushNotification} disabled={!isClient || isTestingNotification}>
            {isTestingNotification ? 'Procesando...' : (notificationPermission === 'granted' ? 'Enviar Notificación de Prueba' : 'Solicitar Permiso y Probar')}
            </Button>
            {!isClient && <p className="text-sm text-muted-foreground mt-2">Cargando...</p>}
            {isClient && !('Notification' in window) && <p className="text-sm text-destructive mt-2">Este navegador no soporta notificaciones.</p>}
             {isClient && notificationPermission && (
              <p className="text-sm text-muted-foreground mt-2">
                Estado del Permiso de Notificación: <span className={
                    notificationPermission === 'granted' ? 'text-green-600' : 
                    notificationPermission === 'denied' ? 'text-red-600' : ''
                }>{notificationPermission}</span>
              </p>
             )}
        </CardContent>
        </Card>
    </div>
  );
}

