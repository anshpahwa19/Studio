import { api } from '@/lib/api-server';
import type { getSettings, listAppointments, listBranches, listCustomers, listServices, listStaff } from '@/lib/api-reads';
import type { DataOf } from '@/lib/api-client';
import { requirePage } from '@/lib/session';
import { canEdit, canView } from '@/lib/roles';
import { addDays, isoDate, weekStart } from '@/lib/format';
import { Planner } from './planner';

export default async function AppointmentsPage({ searchParams }: { searchParams: { date?: string; view?: string; book?: string; customer?: string } }) {
  const user = await requirePage('appointments');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? '') ? searchParams.date! : isoDate();
  const view = searchParams.view === 'week' ? 'week' : 'day';
  const from = view === 'week' ? weekStart(date) : date;
  const to = view === 'week' ? addDays(from, 6) : date;

  const [appointments, staff, categories, customerList, allBranches, settings] = await Promise.all([
    api<DataOf<typeof listAppointments>>('/appointments', { from, to }),
    api<DataOf<typeof listStaff>>('/staff'),
    api<DataOf<typeof listServices>>('/services'),
    api<DataOf<typeof listCustomers>>('/customers', { limit: 5000 }),
    api<DataOf<typeof listBranches>>('/branches'),
    api<DataOf<typeof getSettings>>('/settings'),
  ]);
  const services = categories.flatMap((c) => c.services.map((s) => ({ id: s.id, name: s.name, price: s.price, duration: s.duration, category: { name: c.name } })));
  const customers = customerList.items.map((c) => ({ id: c.id, name: c.name, phone: c.phone, preferredStaffId: c.preferredStaffId }));
  const branches = allBranches.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }));

  return (
    <Planner
      date={date}
      view={view}
      appointments={appointments}
      staff={staff.map((s) => ({ id: s.id, name: s.name, title: s.title, workDays: s.workDays, startTime: s.startTime, endTime: s.endTime }))}
      services={services.map((s) => ({ id: s.id, name: s.name, price: s.price, duration: s.duration, category: s.category.name }))}
      customers={customers}
      branches={branches}
      hours={{ open: settings.openTime ?? '09:00', close: settings.closeTime ?? '21:00' }}
      editable={canEdit(user.role, 'appointments')}
      canBill={canView(user.role, 'billing')}
      bookFor={searchParams.book ? searchParams.customer ?? '' : null}
    />
  );
}
