"use client";

import * as React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks, isWithinInterval } from 'date-fns';
import { DollarSign, Users, Calendar as CalendarIconLucide } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Appointment } from '@/types';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Mock function to get ALL completed appointments (replace with actual API call)
// In a real app, fetch completed appointments with their service price.
async function getCompletedAppointments(barberId: string): Promise<Appointment[]> {
  console.log(`Fetching completed appointments for accounting for barber ${barberId}`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Generate more mock data spanning several weeks/months for better chart demo
  const mockData: Appointment[] = [];
  const today = new Date();
  for (let i = 0; i < 90; i++) { // Simulate data for the last 90 days
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const appointmentsToday = Math.floor(Math.random() * 5) + 1; // 1-5 appointments per day
    for (let j = 0; j < appointmentsToday; j++) {
      const serviceType = Math.random();
      let service;
      if (serviceType < 0.4) service = { id: 'haircut', name: 'Corte de pelo', duration: 30, price: 25 };
      else if (serviceType < 0.7) service = { id: 'beard_trim', name: 'Recorte de barba', duration: 20, price: 15 };
      else if (serviceType < 0.9) service = { id: 'haircut_beard', name: 'Corte de pelo y barba', duration: 50, price: 35 };
      else service = { id: 'shave', name: 'Afeitado con toalla caliente', duration: 40, price: 30 };

      mockData.push({
        id: `acc_app_${i}_${j}`,
        clientName: `Client ${i}-${j}`,
        service: service,
        date: date,
        time: `${Math.floor(Math.random() * 8) + 9}:00` // Random time between 9 AM and 4 PM
      });
    }
  }
  return mockData;
}

interface AccountingPanelProps {
  barberId: string;
}

type TimePeriod = 'this_week' | 'last_week' | 'this_month' | 'last_month';

interface DateRange {
  start: Date;
  end: Date;
}

function getDateRange(period: TimePeriod): DateRange {
  const now = new Date();
  switch (period) {
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last_week':
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return { start: lastWeekStart, end: endOfWeek(lastWeekStart, { weekStartsOn: 1 }) };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month':
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      return { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
    default: // Default to this week
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  }
}

interface DailyRevenue {
  name: string; // Date formatted string
  total: number;
}

export function AccountingPanel({ barberId }: AccountingPanelProps) {
  const [allAppointments, setAllAppointments] = React.useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = React.useState<Appointment[]>([]);
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>('this_month');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    getCompletedAppointments(barberId)
      .then(data => {
        setAllAppointments(data);
      })
      .catch(error => console.error("Failed to fetch completed appointments:", error))
       .finally(() => setIsLoading(false));
  }, [barberId]);

  React.useEffect(() => {
     if (!isLoading) {
        const range = getDateRange(timePeriod);
        const filtered = allAppointments.filter(app =>
          isWithinInterval(app.date, { start: range.start, end: range.end })
        );
        setFilteredAppointments(filtered);
     }
  }, [timePeriod, allAppointments, isLoading]);


   const totalRevenue = filteredAppointments.reduce((sum, app) => sum + app.service.price, 0);
   const totalClients = filteredAppointments.length; // Simple count, assumes unique clients per appointment slot

   const dailyRevenueData: DailyRevenue[] = React.useMemo(() => {
    const revenueMap = new Map<string, number>();
    filteredAppointments.forEach(app => {
      const dateStr = format(app.date, 'MMM d'); // Format for X-axis label
      revenueMap.set(dateStr, (revenueMap.get(dateStr) || 0) + app.service.price);
    });
     // Convert map to array and sort by date (though map iteration order is often sufficient)
     return Array.from(revenueMap.entries())
       .map(([name, total]) => ({ name, total }))
       .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime()); // Ensure correct order if needed
  }, [filteredAppointments]);


   const renderLoadingState = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
       <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
           <DollarSign className="h-4 w-4 text-muted-foreground" />
         </CardHeader>
         <CardContent>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32 mt-1" />
         </CardContent>
       </Card>
        <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
           <Users className="h-4 w-4 text-muted-foreground" />
         </CardHeader>
         <CardContent>
            <Skeleton className="h-8 w-16" />
             <Skeleton className="h-3 w-28 mt-1" />
         </CardContent>
       </Card>
       {/* Add skeletons for other cards if needed */}
       <div className="lg:col-span-4 pt-6">
         <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
               <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="pl-2">
               <Skeleton className="h-[350px] w-full" />
            </CardContent>
         </Card>
       </div>
     </div>
  );


  if (isLoading) {
     return renderLoadingState();
   }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Accounting Overview</h2>
             <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                <SelectTrigger className="w-[180px]">
                    <CalendarIconLucide className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                </SelectContent>
            </Select>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Revenue for selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
             <p className="text-xs text-muted-foreground">Clients served in selected period</p>
          </CardContent>
        </Card>
         {/* Add more summary cards if needed (e.g., Average Revenue per Client) */}
      </div>

      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Daily revenue for the selected period.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
           <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dailyRevenueData}>
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
               <Tooltip
                 cursor={{ fill: 'hsl(var(--accent)/0.1)' }}
                 contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                 labelStyle={{ color: 'hsl(var(--foreground))' }}
                 itemStyle={{ color: 'hsl(var(--foreground))' }}
               />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
