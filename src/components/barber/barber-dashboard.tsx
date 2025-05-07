
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from '@/components/barber/calendar-view';
import { NotificationsPanel } from '@/components/barber/notifications-panel';
import { AccountingPanel } from '@/components/barber/accounting-panel';
import { SettingsPanel } from '@/components/barber/settings-panel';
import { RentPanel } from '@/components/barber/rent-panel';
import { CatalogPanel } from '@/components/barber/catalog-panel';
import { AnnouncementPanel } from '@/components/barber/announcement-panel'; // Import AnnouncementPanel
import { CalendarDays, BellRing, Settings, Wallet, Banknote, List, Megaphone } from 'lucide-react'; // Add Megaphone icon

export function BarberDashboard() {
  const barberId = "barber123"; 

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold mb-6">Panel del Barbero</h1>
      <Tabs defaultValue="calendar" className="flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 mb-4"> {/* Adjusted grid for new tab */}
          <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" />Calendario</TabsTrigger>
          <TabsTrigger value="notifications"><BellRing className="mr-2 h-4 w-4" />Notificaciones</TabsTrigger>
          <TabsTrigger value="catalog"><List className="mr-2 h-4 w-4" />Catálogo</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-2 h-4 w-4" />Anuncios</TabsTrigger> {/* Added Announcements Tab */}
          <TabsTrigger value="accounting"><Wallet className="mr-2 h-4 w-4" />Contabilidad</TabsTrigger>
          <TabsTrigger value="rent"><Banknote className="mr-2 h-4 w-4" />Renta</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="flex-grow mt-0">
          <CalendarView barberId={barberId} />
        </TabsContent>
        <TabsContent value="notifications" className="flex-grow mt-0">
          <NotificationsPanel barberId={barberId} />
        </TabsContent>
        <TabsContent value="catalog" className="flex-grow mt-0">
           <CatalogPanel barberId={barberId} />
        </TabsContent>
        {/* Added TabsContent for Announcements */}
        <TabsContent value="announcements" className="flex-grow mt-0">
           <AnnouncementPanel barberId={barberId} />
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
