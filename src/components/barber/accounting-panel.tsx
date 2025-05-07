 "use client";

import * as React from 'react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks, isWithinInterval, parseISO, compareAsc, isSameDay } from 'date-fns'; // Added parseISO, compareAsc, isSameDay
import { DollarSign, Users, Calendar as CalendarIconLucide, CheckCircle, XCircle, UserX } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
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
import { Skeleton } from '@/components/ui/skeleton';
import { getClientAppointments } from '@/lib/storage'; // Fetch from storage
import { formatCurrency } from '@/lib/currency-utils'; // Import currency formatter

interface AccountingPanelProps {
  barberId: string;
}

type TimePeriod = 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month';

interface DateRange {
  start: Date;
  end: Date;
}

function getDateRange(period: TimePeriod): DateRange {
  const now = new Date();
  switch (period) {
     case 'today':
         return { start: startOfDay(now), end: endOfDay(now) };
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
  name: string; // Date formatted string (e.g., "Jul 4")
  total: number;
  dateObj: Date; // Keep original date for sorting
}

interface ServiceCount {
   name: string;
   count: number;
}

const statusColors = {
    completed: "hsl(var(--chart-1))",
    cancelled: "hsl(var(--destructive))",
    noshow: "hsl(var(--chart-5))", // Changed from noShow to noshow to match appointment status values
};

export function AccountingPanel({ barberId }: AccountingPanelProps) {
  const [allAppointments, setAllAppointments] = React.useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = React.useState<Appointment[]>([]);
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>('this_month');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isClient, setIsClient] = React.useState(false);


  React.useEffect(() => {
    setIsClient(true);
  }, []);


  const fetchAndFilterAppointments = React.useCallback(() => {
     if (!isClient) return; // Only run on client

     setIsLoading(true);
     try {
       const appointmentsFromStorage = getClientAppointments(); // Get all appointments
       setAllAppointments(appointmentsFromStorage);

       const range = getDateRange(timePeriod);
       const filtered = appointmentsFromStorage.filter(app =>
         isWithinInterval(app.date, { start: range.start, end: range.end })
       );
       setFilteredAppointments(filtered);
     } catch (error) {
        console.error("Failed to fetch or filter appointments:", error);
        setAllAppointments([]);
        setFilteredAppointments([]);
     } finally {
        setIsLoading(false);
     }
  }, [timePeriod, isClient]);


  React.useEffect(() => {
    if (isClient) {
        fetchAndFilterAppointments();

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'barberEaseClientAppointments' || event.key === null) {
                fetchAndFilterAppointments();
            }
        };
        const handleAppointmentBookedOrStatusChanged = () => fetchAndFilterAppointments();

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('appointmentbooked', handleAppointmentBookedOrStatusChanged);
        window.addEventListener('appointmentstatuschanged', handleAppointmentBookedOrStatusChanged); // Listen for status change

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('appointmentbooked', handleAppointmentBookedOrStatusChanged);
            window.removeEventListener('appointmentstatuschanged', handleAppointmentBookedOrStatusChanged);
        };
    }
  }, [fetchAndFilterAppointments, isClient]);

   const completedAppointments = filteredAppointments.filter(app => app.status === 'completed');
   const totalRevenue = completedAppointments.reduce((sum, app) => sum + app.bookedItem.price, 0);
   const totalClients = filteredAppointments.length;


   const dailyRevenueData: Omit<DailyRevenue, 'dateObj'>[] = React.useMemo(() => {
    const revenueMap = new Map<string, { total: number; dateObj: Date }>();
    completedAppointments.forEach(app => {
       const dateStr = format(app.date, 'yyyy-MM-dd');
       const current = revenueMap.get(dateStr) || { total: 0, dateObj: app.date };
       current.total += app.bookedItem.price;
       revenueMap.set(dateStr, current);
    });
     return Array.from(revenueMap.values())
        .sort((a, b) => compareAsc(a.dateObj, b.dateObj))
        .map(data => ({
            name: format(data.dateObj, 'MMM d'),
            total: data.total,
        }));
   }, [completedAppointments]);


   const servicePopularityData: ServiceCount[] = React.useMemo(() => {
    const serviceCounts = new Map<string, number>();
    // Use all appointments in the period for popularity, regardless of status,
    // as a cancelled booking still indicates interest in a service.
    filteredAppointments.forEach(app => {
        const serviceName = app.bookedItem.name;
        serviceCounts.set(serviceName, (serviceCounts.get(serviceName) || 0) + 1);
    });
    return Array.from(serviceCounts).map(([name, count]) => ({ name, count }));
}, [filteredAppointments]);


   const dailyCashDrawer = React.useMemo(() => {
        // Calculate from *all* appointments, then filter for today's completed ones
        const todayStart = startOfDay(new Date());
        const todaysCompletedAppointments = allAppointments.filter(app =>
            app.status === 'completed' && isSameDay(app.date, todayStart)
        );
        return todaysCompletedAppointments.reduce((sum, app) => sum + app.bookedItem.price, 0);
   }, [allAppointments]);


   const appointmentStatusData = React.useMemo(() => {
    const completedCount = filteredAppointments.filter(app => app.status === 'completed').length;
    const cancelledCount = filteredAppointments.filter(app => app.status === 'cancelled').length;
    const noShowCount = filteredAppointments.filter(app => app.status === 'noShow').length;

    const total = completedCount + cancelledCount + noShowCount;
    const calculatePercentage = (count: number) => (total > 0 ? (count / total * 100).toFixed(1) : '0.0');

    return [
        { name: 'Completed', value: completedCount, percentage: calculatePercentage(completedCount) },
        { name: 'Cancelled', value: cancelledCount, percentage: calculatePercentage(cancelledCount) },
        { name: 'No Show', value: noShowCount, percentage: calculatePercentage(noShowCount) },
    ].filter(item => item.value > 0);
   }, [filteredAppointments]);

   const hasAppointmentData = appointmentStatusData.length > 0;


   const renderLoadingState = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
       <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
           <DollarSign className="h-4 w-4 text-muted-foreground" />
         </CardHeader>
         <CardContent>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32 mt-1" />
         </CardContent>
       </Card>
        <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
           <Users className="h-4 w-4 text-muted-foreground" />
         </CardHeader>
         <CardContent>
            <Skeleton className="h-8 w-16" />
             <Skeleton className="h-3 w-28 mt-1" />
         </CardContent>
       </Card>
       <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Cierre de Caja Diario</CardTitle>
               <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32 mt-1" />
            </CardContent>
         </Card>
         <div className="lg:col-span-4 pt-6"> {/* Corrected from md:col-span-4 */}
         <Card>
            <CardHeader>
              <CardTitle>Resumen de Ingresos</CardTitle>
               <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="pl-2">
               <Skeleton className="h-[350px] w-full" />
            </CardContent>
         </Card>
       </div>
       <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Popularidad del Servicio</CardTitle>
            <CardDescription>Servicios más reservados</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado de la Cita</CardTitle>
            <CardDescription>Desglose del estado de la cita</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
     </div>
  );


  if (!isClient || isLoading) { // Show skeleton if not client or loading
     return renderLoadingState();
   }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Resumen de Contabilidad</h2>
             <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                <SelectTrigger className="w-[180px]">
                    <CalendarIconLucide className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Seleccionar periodo" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="this_week">Esta Semana</SelectItem>
                    <SelectItem value="last_week">Semana Pasada</SelectItem>
                    <SelectItem value="this_month">Este Mes</SelectItem>
                    <SelectItem value="last_month">Mes Pasado</SelectItem>
                </SelectContent>
            </Select>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Ingresos completados en el periodo</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cierre de Caja Diario</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{formatCurrency(dailyCashDrawer)}</div>
             <p className="text-xs text-muted-foreground">Efectivo de citas completadas hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
             <p className="text-xs text-muted-foreground">Clientes agendados en el periodo</p>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-4"> {/* Corrected from md:col-span-4 */}
        <CardHeader>
          <CardTitle>Resumen de Ingresos</CardTitle>
          <CardDescription>Ingresos diarios completados para el periodo seleccionado.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {dailyRevenueData.length === 0 ? (
             <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                No hay datos de ingresos completados para este periodo.
             </div>
           ) : (
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
                tickFormatter={(value) => formatCurrency(value)}
              />
               <Tooltip
                 cursor={{ fill: 'hsl(var(--accent)/0.1)' }}
                 contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                 labelStyle={{ color: 'hsl(var(--foreground))' }}
                 itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => formatCurrency(value)}
               />
              <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} /> {/* Changed from --primary to --accent */}
            </BarChart>
          </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
         <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Popularidad del Servicio</CardTitle>
            <CardDescription>Servicios más reservados</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {servicePopularityData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No hay datos de popularidad de servicios para este periodo.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    dataKey="count"
                    isAnimationActive={false}
                    data={servicePopularityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label={(props) => {
                         const { cx, cy, midAngle, innerRadius, outerRadius, index } = props;
                         if (index === undefined || servicePopularityData[index] === undefined) return null; // Guard against undefined
                         const RADIAN = Math.PI / 180;
                         // Adjust radius for better label placement if needed
                         const radius = innerRadius + (outerRadius - innerRadius) * 0.6; // Move labels slightly inwards
                         const x = cx + radius * Math.cos(-midAngle * RADIAN);
                         const y = cy + radius * Math.sin(-midAngle * RADIAN);
                         const entry = servicePopularityData[index];

                         return (
                            <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>
                                {`${entry.name} (${entry.count})`}
                            </text>
                         );
                    }}
                     labelLine={false}
                  >
                    {servicePopularityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index % 5 + 1}))`} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, name: string) => [`${value} reservas`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
           <CardHeader>
             <CardTitle>Estado de la Cita</CardTitle>
             <CardDescription>Desglose del estado de la cita</CardDescription>
           </CardHeader>
           <CardContent className="pl-2">
              {hasAppointmentData ? (
                 <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                         data={appointmentStatusData}
                         dataKey="value"
                         cx="50%"
                         cy="50%"
                         outerRadius={80}
                         labelLine={false}
                         label={(props: any) => { // Using any for props to access payload easily
                             const {name, value, percentage} = props.payload || {};
                             if (name === undefined || value === undefined || percentage === undefined) return null;
                             return `${name}: ${value} (${percentage}%)`;
                         }}
                      >
                         {appointmentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={statusColors[entry.name.toLowerCase().replace(' ', '') as keyof typeof statusColors] || "hsl(var(--muted))"} />
                         ))}
                      </Pie>
                      <Tooltip
                         contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                         labelStyle={{ color: 'hsl(var(--foreground))' }}
                         itemStyle={{ color: 'hsl(var(--foreground))' }}
                         formatter={(value: number, name: string, props: any) => {
                             const percentage = props?.payload?.percentage || '0.0';
                             return [`${value} (${percentage}%)`, name];
                         }}
                      />
                    </PieChart>
                 </ResponsiveContainer>
              ) : (
                 <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No hay datos de estado de citas para este periodo.
                 </div>
              )}
           </CardContent>
         </Card>
      </div>
    </div>
  );
}

