
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import {
  useForm,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  BarberSettings,
} from "@/types"
import { useEffect, useState } from "react"
import {
  getBarberSettingsFromStorage,
  saveBarberSettingsToStorage,
  defaultSettings,
} from "@/lib/settings-storage"
import { toast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { useFieldArray } from "react-hook-form"
import { PlusCircle, Save, Trash2, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Define the schema for form validation
const settingsSchema = z.object({
  workHours: z.object({
    start: z.string().refine(value => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), {
      message: "Invalid time format. Use HH:mm (24-hour format)",
    }),
    end: z.string().refine(value => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), {
      message: "Invalid time format. Use HH:mm (24-hour format)",
    }),
  }).refine((data) => data.start < data.end, {
    message: "Start time must be before end time",
    path: ["root"] // Apply error to the root of the workHours object
  }),
  breakTimes: z.array(
    z.object({
      start: z.string().refine(value => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), {
        message: "Invalid time format. Use HH:mm (24-hour format)",
      }),
      end: z.string().refine(value => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), {
        message: "Invalid time format. Use HH:mm (24-hour format)",
      }),
    }).refine((data) => data.start < data.end, {
      message: "Start time must be before end time",
      path: ["root"] // Apply error to the root of the breakTimes object
    })
  ),
  lunchBreak: z.object({
    start: z.string().refine(value => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), {
      message: "Invalid time format. Use HH:mm (24-hour format)",
    }),
    end: z.string().refine(value => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), {
      message: "Invalid time format. Use HH:mm (24-hour format)",
    }),
  }).refine((data) => data.start < data.end, {
    message: "Start time must be before end time",
    path: ["root"] // Apply error to the root of the lunchBreak object
  }),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

interface SettingsPanelProps {
  barberId: string;
}

export function SettingsPanel({ barberId }: SettingsPanelProps) {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  console.log("SettingsPanel: Initial Render. Waiting for client mount...");

  React.useEffect(() => {
    setIsClient(true); // Component has mounted on client
    console.log("SettingsPanel: Client mounted. isLoading was:", isLoading);
    // No need to set isLoading to false here, it will be handled by the data loading effect
  }, []);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    // Initialize with empty/default values, they will be reset once client mounts
    defaultValues: {
      workHours: { start: '00:00', end: '00:00' },
      breakTimes: [],
      lunchBreak: { start: '00:00', end: '00:00' },
    },
    // Don't reset immediately, wait for client mount and data load
    // mode: 'onChange', // Enable if needed, but can cause re-renders
  });

  // Effect to load data from storage and reset the form ONLY when client mounts
  React.useEffect(() => {
    if (isClient) {
      console.log("SettingsPanel: Client mounted, loading settings and resetting form.");
      setIsLoading(true); // Start loading indicator
      try {
          const storedSettings = getBarberSettingsFromStorage(barberId);
          console.log("SettingsPanel: Loaded settings from storage:", storedSettings);
          form.reset(storedSettings); // Reset form with loaded data
      } catch (error) {
           console.error("SettingsPanel: Error loading settings from storage:", error);
           // Optionally reset to defaults or show error
           form.reset(defaultSettings); // Reset to default on error
           toast({
                title: "Error Loading Settings",
                description: "Could not load saved settings. Defaults have been applied.",
                variant: "destructive",
            });
      } finally {
          console.log("SettingsPanel: Finished loading settings, setting isLoading to false.");
          setIsLoading(false); // Finish loading indicator
      }
    }
  }, [isClient, barberId, form.reset, toast]); // form.reset and toast added


   const { fields: breakFields, append: appendBreak, remove: removeBreak } = useFieldArray({
    control: form.control,
    name: "breakTimes",
  });


  function onSubmit(data: SettingsFormValues) {
    if (!isClient) {
        console.warn("SettingsPanel: onSubmit called on server. Aborting.");
        return;
    }

    console.log("SettingsPanel: Submitting form data:", data);
    setIsSaving(true);
    try {
      const success = saveBarberSettingsToStorage(barberId, data);
      if (success) {
        console.log("SettingsPanel: Settings saved successfully.");
        toast({
          title: 'Settings Saved',
          description: 'Your schedule has been updated successfully.',
        });
         form.reset(data); // Update form state with the *successfully* saved data
      } else {
         throw new Error("Failed to save settings to local storage.");
      }
    } catch (error) {
      console.error("SettingsPanel: Failed to save settings:", error);
      toast({
        title: 'Save Failed',
        description: 'Could not update your schedule. Please try again.',
        variant: 'destructive',
      });
      // Optionally, you might want to revert the form state here
      // or keep the user's input for them to retry
    } finally {
        console.log("SettingsPanel: Finished saving attempt.");
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


   // Show skeleton during SSR or while loading data on client
   if (!isClient || isLoading) {
        console.log(`SettingsPanel: Rendering Skeleton (isClient: ${isClient}, isLoading: ${isLoading})`);
        return renderSkeleton();
   }

   console.log("SettingsPanel: Rendering Form. Current form state:", form.getValues());


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
                       <FormMessage /> {/* Ensure message shows for end time too */}
                    </FormItem>
                  )}
                />
              </div>
                {/* Display top-level error for workHours refinement */}
                {form.formState.errors.workHours?.root?.message && (
                 <p className="text-sm font-medium text-destructive pt-1">
                   {form.formState.errors.workHours.root.message}
                 </p>
               )}
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
                       <FormMessage /> {/* Ensure message shows for end time too */}
                    </FormItem>
                  )}
                />
              </div>
               {/* Display top-level error for lunchBreak refinement */}
               {form.formState.errors.lunchBreak?.root?.message && (
                 <p className="text-sm font-medium text-destructive pt-1">
                   {form.formState.errors.lunchBreak.root.message}
                 </p>
               )}
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
                         <FormMessage /> {/* Shows error for end time */}
                       </FormItem>
                     )}
                   />
                    {/* Display top-level error for break refinement */}
                    {form.formState.errors.breakTimes?.[index]?.root?.message && (
                       <p className="text-sm font-medium text-destructive pt-1 sm:col-span-2">
                         {form.formState.errors.breakTimes[index]?.root?.message}
                       </p>
                     )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeBreak(index)}
                      aria-label="Remove break"
                      className="sm:mt-6" // Adjust alignment if needed
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
            <Button type="submit" disabled={isSaving || isLoading}> {/* Disable while loading initial data too */}
               <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
    