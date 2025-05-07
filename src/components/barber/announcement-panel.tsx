
"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { Announcement, BarberSettings } from '@/types';
import { getBarberSettingsFromStorage, saveBarberSettingsToStorage, defaultAnnouncement } from '@/lib/settings-storage';
import { CalendarIcon, Save, AlertTriangle, Info, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)").optional().or(z.literal(''));

const announcementSchema = z.object({
  message: z.string().min(1, "El mensaje es requerido.").max(300, "El mensaje no puede exceder los 300 caracteres."),
  isActive: z.boolean(),
  affectsBooking: z.enum(['none', 'closed_day', 'custom_hours']),
  effectiveDate: z.date().optional(),
  customStartTime: timeStringSchema,
  customEndTime: timeStringSchema,
}).refine(data => {
  if (data.affectsBooking !== 'none' && !data.effectiveDate) {
    return false;
  }
  return true;
}, {
  message: "Se requiere una fecha efectiva si el anuncio afecta las reservas.",
  path: ["effectiveDate"],
}).refine(data => {
  if (data.affectsBooking === 'custom_hours' && (!data.customStartTime || !data.customEndTime)) {
    return false;
  }
  return true;
}, {
  message: "Se requieren horas de inicio y fin personalizadas.",
  path: ["customStartTime"], // Or customEndTime, path is for error display anchor
}).refine(data => {
  if (data.affectsBooking === 'custom_hours' && data.customStartTime && data.customEndTime && data.customStartTime >= data.customEndTime) {
    return false;
  }
  return true;
}, {
  message: "La hora de fin personalizada debe ser posterior a la hora de inicio.",
  path: ["customEndTime"],
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

interface AnnouncementPanelProps {
  barberId: string;
}

export function AnnouncementPanel({ barberId }: AnnouncementPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      message: '',
      isActive: false,
      affectsBooking: 'none',
      effectiveDate: undefined,
      customStartTime: '',
      customEndTime: '',
    },
    mode: 'onChange',
  });

  React.useEffect(() => {
    if (isClient) {
      setIsLoading(true);
      const settings = getBarberSettingsFromStorage(barberId);
      const currentAnnouncement = settings.announcement || { ...defaultAnnouncement };
      form.reset({
        ...currentAnnouncement,
        effectiveDate: currentAnnouncement.effectiveDate ? parseISO(currentAnnouncement.effectiveDate) : undefined,
      });
      setIsLoading(false);
    }
  }, [isClient, barberId, form.reset]);

  const onSubmit = (data: AnnouncementFormValues) => {
    if (!isClient) return;
    setIsSaving(true);
    try {
      const settings = getBarberSettingsFromStorage(barberId);
      const newAnnouncement: Announcement = {
        id: settings.announcement?.id || crypto.randomUUID(),
        ...data,
        effectiveDate: data.effectiveDate ? format(data.effectiveDate, 'yyyy-MM-dd') : undefined,
      };

      const updatedSettings: BarberSettings = {
        ...settings,
        announcement: newAnnouncement,
      };

      const success = saveBarberSettingsToStorage(barberId, updatedSettings);
      if (success) {
        toast({
          title: 'Anuncio Guardado',
          description: 'La configuración de tu anuncio ha sido actualizada.',
        });
        form.reset({ // Reset form with the saved data including parsed date
            ...newAnnouncement,
            effectiveDate: newAnnouncement.effectiveDate ? parseISO(newAnnouncement.effectiveDate) : undefined,
        });
      } else {
        throw new Error("Failed to save announcement to local storage.");
      }
    } catch (error) {
      console.error("Failed to save announcement:", error);
      toast({
        title: 'Guardado Fallido',
        description: 'No se pudo actualizar tu anuncio. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const affectsBookingValue = form.watch('affectsBooking');

  if (!isClient || isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-2/5" />
          <Skeleton className="h-4 w-4/5 mt-1" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-28" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar Anuncios</CardTitle>
        <CardDescription>
          Crea o actualiza anuncios para tus clientes. Estos se mostrarán en la página de reservas.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensaje del Anuncio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Hoy cerramos a las 5 PM por un evento especial."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Activar Anuncio</FormLabel>
                    <FormDescription>
                      Si está activo, el anuncio se mostrará a los clientes.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="affectsBooking"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Anuncio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona cómo afecta las reservas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center">
                          <Info className="mr-2 h-4 w-4" /> Solo Informativo
                        </div>
                      </SelectItem>
                      <SelectItem value="closed_day">
                        <div className="flex items-center">
                           <AlertTriangle className="mr-2 h-4 w-4 text-destructive" /> Cerrar Reservas del Día
                        </div>
                      </SelectItem>
                      <SelectItem value="custom_hours">
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4" /> Horario Personalizado para el Día
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Elige si este anuncio solo informa o modifica la disponibilidad de reservas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {affectsBookingValue !== 'none' && (
              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Efectiva del Anuncio</FormLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Selecciona una fecha</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      La fecha en que este anuncio y sus efectos de reserva aplicarán.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {affectsBookingValue === 'custom_hours' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva Hora de Inicio</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva Hora de Fin</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving || isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar Anuncio'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
