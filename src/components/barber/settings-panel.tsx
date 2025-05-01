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
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Time format validation (HH:MM in 24-hour format)
const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)");

const settingsSchema = z.object({
  workHours: z.object({
    start: timeStringSchema,
    end: timeStringSchema,
  }),
  breakTimes: z.array(z.object({
    start: timeStringSchema,
    end: timeStringSchema,
  })),
  lunchBreak: z.object({
    start: timeStringSchema,
    end: timeStringSchema,
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// Mock function to get current settings (replace with API call)
async function getBarberSettings(barberId: string): Promise<BarberSettings> {
  console.log(`Fetching settings for barber ${barberId}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  // Return default/mock settings
  return {
    workHours: { start: '09:00', end: '17:00' },
    breakTimes: [{ start: '11:00', end: '11:15' }],
    lunchBreak: { start: '12:30', end: '13:00' },
  };
}

// Mock function to save settings (replace with API call)
async function saveBarberSettings(barberId: string, settings: BarberSettings): Promise<boolean> {
  console.log(`Saving settings for barber ${barberId}:`, settings);
   await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  // Simulate success/failure
  return Math.random() > 0.1; // 90% success rate
}

interface SettingsPanelProps {
  barberId: string;
}

export function SettingsPanel({ barberId }: SettingsPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
   const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: async () => {
      setIsLoading(true);
      try {
        const settings = await getBarberSettings(barberId);
        return settings;
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast({ title: "Error", description: "Could not load settings.", variant: "destructive" });
        // Return safe defaults on error
        return { workHours: { start: '09:00', end: '17:00' }, breakTimes: [], lunchBreak: { start: '12:00', end: '13:00' } };
      } finally {
        setIsLoading(false);
      }
    }
  });

   const { fields: breakFields, append: appendBreak, remove: removeBreak } = useFieldArray({
    control: form.control,
    name: "breakTimes",
  });


  async function onSubmit(data: SettingsFormValues) {
    setIsSaving(true);
    try {
      const success = await saveBarberSettings(barberId, data);
      if (success) {
        toast({
          title: 'Settings Saved',
          description: 'Your schedule has been updated successfully.',
        });
         form.reset(data); // Update form state with saved data
      } else {
         throw new Error("Failed to save settings on the server.");
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
          {/* Work Hours Skeleton */}
         <div>
            <Skeleton className="h-5 w-24 mb-2" />
            <div className="grid grid-cols-2 gap-4">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
            </div>
         </div>
         <Separator/>
          {/* Lunch Break Skeleton */}
          <div>
             <Skeleton className="h-5 w-32 mb-2" />
             <div className="grid grid-cols-2 gap-4">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
             </div>
          </div>
          <Separator/>
          {/* Break Times Skeleton */}
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


   if (isLoading) {
    return renderSkeleton();
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Schedule Settings</CardTitle>
        <CardDescription>Adjust your daily work hours, lunch, and break times.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-6">
            {/* Work Hours */}
            <div>
              <h3 className="text-lg font-medium mb-2">Work Hours</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="workHours.start"
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
                  name="workHours.end"
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
            </div>

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
            <Button type="submit" disabled={isSaving}>
               <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
