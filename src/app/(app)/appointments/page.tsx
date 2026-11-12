import { db } from '@/lib/db';
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

  const [appointments, staff, services, customers, branches, settings] = await Promise.all([
    db.appointment.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: { branch: { select: { name: true } }, customer: { select: { id: true, name: true, phone: true } }, services: { select: { name: true, price: true } }, invoice: { select: { id: true, status: true } } },
    }),
    db.staff.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, title: true, workDays: true, startTime: true, endTime: true } }),
    db.service.findMany({ where: { active: true }, orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }], select: { id: true, name: true, price: true, duration: true, category: { select: { name: true } } } }),
    db.customer.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true, preferredStaffId: true } }),
    db.branch.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.settings.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <Planner
      date={date}
      view={view}
      appointments={appointments}
      staff={staff}
      services={services.map((s) => ({ id: s.id, name: s.name, price: s.price, duration: s.duration, category: s.category.name }))}
      customers={customers}
      branches={branches}
      hours={{ open: settings?.openTime ?? '09:00', close: settings?.closeTime ?? '21:00' }}
      editable={canEdit(user.role, 'appointments')}
      canBill={canView(user.role, 'billing')}
      bookFor={searchParams.book ? searchParams.customer ?? '' : null}
    />
  );
}
