import { ClientBooking } from '@/components/client/client-booking';
import { ClientAppointments } from '@/components/client/client-appointments';

export default function ClientPage() {
  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-bold text-center">Reserva tu cita</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ClientBooking />
        <ClientAppointments />
      </div>
    </div>
  );
}
