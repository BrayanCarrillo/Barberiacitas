"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
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
import { useToast } from '@/hooks/use-toast';
import type { BarberSettings } from '@/types';
import { PlusCircle, Save, Trash2, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getBarberSettingsFromStorage, saveBarberSettingsToStorage } from '@/lib/settings-storage';
import { Checkbox } from '@/components/ui/checkbox';

// Time format validation (HH:MM in 24-hour format)
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)");

const dailyScheduleSchema = z.object({
  available: z.boolean(),
  start: timeStringSchema.optional(),
  end: timeStringSchema.optional(),
}).refine(data => !data.available || (data.start !== undefined && data.end !== undefined), {
  message: "Start and end times are required when the day is available.",
  path: ["start"], // You can target the error to one of the fields
}).refine(data => !data.available || (data.start! < data.end!), {
    message: "Work end time must be after start time.",
    path: ["end"], // Attach error to the 'end' field
});

const settingsSchema = z.object({
  rentAmount: z.number().positive({ message: 'Rent amount must be positive.' }),
  monday: dailyScheduleSchema,
  tuesday: dailyScheduleSchema,
  wednesday: dailyScheduleSchema,
  thursday: dailyScheduleSchema,
  friday: dailyScheduleSchema,
  saturday: dailyScheduleSchema,
  sunday: dailyScheduleSchema,
  breakTimes: z.array(z.object({
    start: timeStringSchema,
    end: timeStringSchema,
  }).refine(data => data.start < data.end, {
      message: "Break end time must be after start time.",
      path: ["end"],
  })),
  lunchBreak: z.object({
    start: timeStringSchema,
    end: timeStringSchema,
  }).refine(data => data.start < data.end, {
      message: "Lunch end time must be after start time.",
      path: ["end"],
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;


interface SettingsPanelProps {
  barberId: string;
}

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;


export function SettingsPanel({ barberId }: SettingsPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
   const [isSaving, setIsSaving] = React.useState(false);
   const [isClient, setIsClient] = React.useState(false);

   React.useEffect(() => {
       setIsClient(true);
       setIsLoading(false);
   }, []);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        rentAmount: 0,
        monday: { available: true, start: '09:00', end: '17:00' },
        tuesday: { available: true, start: '09:00', end: '17:00' },
        wednesday: { available: true, start: '09:00', end: '17:00' },
        thursday: { available: true, start: '09:00', end: '17:00' },
        friday: { available: true, start: '09:00', end: '17:00' },
        saturday: { available: false },
        sunday: { available: false },
         breakTimes: [],
         lunchBreak: { start: '12:00', end: '13:00' },
    },
     shouldUnregister: false,
  });

   React.useEffect(() => {
     if (isClient) {
       console.log("SettingsPanel: Client mounted, resetting form with stored data.");
       const storedSettings = getBarberSettingsFromStorage(barberId);
       form.reset(storedSettings);
       setIsLoading(false);
     }
   }, [isClient, barberId, form.reset]);


   const { fields: breakFields, append: appendBreak, remove: removeBreak } = useFieldArray({
    control: form.control,
    name: "breakTimes",
  });


  function onSubmit(data: SettingsFormValues) {
    if (!isClient) return;

    setIsSaving(true);
    try {
      const success = saveBarberSettingsToStorage(barberId, data);
      if (success) {
        toast({
          title: 'Settings Saved',
          description: 'Your schedule has been updated successfully.',
        });
         form.reset(data);
      } else {
         throw new Error("Failed to save settings to local storage.");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: 'Save Failed',
        description: 'Could not update your schedule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

   const renderSkeleton = () => (
     <Card>
       <CardHeader>
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-4 w-4/5 mt-1" />
       </CardHeader>
       <CardContent className="space-y-6">
           <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-10 w-full" />
         <Separator/>
          {daysOfWeek.map(day => (
            <div key={day}>
              <Skeleton className="h-5 w-32 mb-2" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
         <Separator/>
          <div>
             <Skeleton className="h-5 w-32 mb-2" />
             <div className="grid grid-cols-2 gap-4">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
             </div>
          </div>
          <Separator/>
         <div>
            <Skeleton className="h-5 w-28 mb-2" />
            <div className="grid grid-cols-3 gap-4 items-end">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-9 w-9" />
            </div>
            <Skeleton className="h-9 w-32 mt-4" />
         </div>
       </CardContent>
        <CardFooter>
           <Skeleton className="h-10 w-28" />
        </CardFooter>
     </Card>
   );


   if (!isClient || isLoading) {
    return renderSkeleton();
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Schedule Settings</CardTitle>
        <CardDescription>Adjust your daily work hours, rent amount, lunch, and break times.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
               <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            {daysOfWeek.map(day => (
              <div key={day}>
                <h3 className="text-lg font-medium mb-2">{day.charAt(0).toUpperCase() + day.slice(1)}</h3>
                <FormField
                  control={form.control}
                  name={day}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value.available}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-base">Available</FormLabel>
                      </div>
                      {field.value.available && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <FormField
                            control={form.control}
                            name={`${day}.start`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`${day}.end`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}

            <Separator />

             {/* Lunch Break */}
             <div>
              <h3 className="text-lg font-medium mb-2">Lunch Break</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="lunchBreak.start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="lunchBreak.end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormDescription className="mt-2 flex items-center gap-1 text-xs">
                 <Clock className="h-3 w-3" />
                 Ensure lunch time is within your work hours.
               </FormDescription>
            </div>

            <Separator />

             {/* Break Times */}
            <div>
               <h3 className="text-lg font-medium mb-2">Other Breaks</h3>
               {breakFields.map((field, index) => (
                 <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end mb-4 p-4 border rounded-md bg-muted/50">
                    <FormField
                     control={form.control}
                     name={`breakTimes.${index}.start`}
                     render={({ field: f }) => (
                       <FormItem>
                         <FormLabel>Break Start</FormLabel>
                         <FormControl>
                           <Input type="time" {...f} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name={`breakTimes.${index}.end`}
                     render={({ field: f }) => (
                       <FormItem>
                         <FormLabel>Break End</FormLabel>
                         <FormControl>
                           <Input type="time" {...f} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeBreak(index)}
                      aria-label="Remove break"
                     >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
               ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendBreak({ start: '', end: '' })}
                 >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Break
                </Button>
                 <FormDescription className="mt-2 flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                   Define any additional short breaks during your work hours.
                 </FormDescription>
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving || !isClient}>
               <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
