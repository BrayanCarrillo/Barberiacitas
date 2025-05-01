import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from '@/components/barber/calendar-view';
import { NotificationsPanel } from '@/components/barber/notifications-panel';
import { AccountingPanel } from '@/components/barber/accounting-panel';
import { SettingsPanel } from '@/components/barber/settings-panel';
import { RentPanel } from '@/components/barber/rent-panel';
import { CatalogPanel } from '@/components/barber/catalog-panel'; // Import the new panel
import { CalendarDays, BellRing, Settings, Wallet, Banknote, List } from 'lucide-react'; // Add List icon

export function BarberDashboard() {
  // Mock data - replace with actual data fetching
  const barberId = "barber123"; // Example barber ID

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold mb-6">Barber Dashboard</h1>
      <Tabs defaultValue="calendar" className="flex-grow flex flex-col">
        {/* Updated TabsList with Catalog */}
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 mb-4">
          <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" />Calendar</TabsTrigger>
          <TabsTrigger value="notifications"><BellRing className="mr-2 h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="catalog"><List className="mr-2 h-4 w-4" />Catalog</TabsTrigger> {/* Added Catalog */}
          <TabsTrigger value="accounting"><Wallet className="mr-2 h-4 w-4" />Accounting</TabsTrigger>
          <TabsTrigger value="rent"><Banknote className="mr-2 h-4 w-4" />Rent</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="flex-grow mt-0">
          <CalendarView barberId={barberId} />
        </TabsContent>
        <TabsContent value="notifications" className="flex-grow mt-0">
          <NotificationsPanel barberId={barberId} />
        </TabsContent>
        {/* Added TabsContent for Catalog */}
        <TabsContent value="catalog" className="flex-grow mt-0">
           <CatalogPanel barberId={barberId} />
        </TabsContent>
        <TabsContent value="accounting" className="flex-grow mt-0">
          <AccountingPanel barberId={barberId} />
        </TabsContent>
         <TabsContent value="rent" className="flex-grow mt-0">
          <RentPanel barberId={barberId} />
        </TabsContent>
        <TabsContent value="settings" className="flex-grow mt-0">
          <SettingsPanel barberId={barberId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```