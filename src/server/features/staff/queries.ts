import 'server-only';
import { db } from '@/server/db';
import { ActionError } from '@/server/auth/session';
import { canView } from '@/lib/roles';
import { isoDate } from '@/lib/format';
import { read, type Q } from '@/server/api/helpers';

export const listStaff = (q: Q) =>
  read('appointments', async (user) => {
    // Stylists and receptionists need the list to book; pay details are for owners and managers only.
    const full = canView(user.role, 'staff');
    const [rows, upcoming] = await Promise.all([
      db.staff.findMany({ where: q.get('archived') === '1' ? {} : { active: true }, orderBy: { name: 'asc' } }),
      db.appointment.groupBy({ by: ['staffId'], where: { status: 'Booked', date: { gte: isoDate() } }, _count: true }),
    ]);
    const n = new Map(upcoming.map((u) => [u.staffId, u._count]));
    return rows.map((s) => (full ? { ...s, upcoming: n.get(s.id) ?? 0 } : { id: s.id, name: s.name, title: s.title, workDays: s.workDays, startTime: s.startTime, endTime: s.endTime, active: s.active, upcoming: n.get(s.id) ?? 0 }));
  });

export const getStaff = (id: string) =>
  read('staff', async () => {
    const s = await db.staff.findUnique({ where: { id } });
    if (!s) throw new ActionError('Staff member not found.', 404);
    return { ...s, upcoming: await db.appointment.count({ where: { staffId: id, status: 'Booked', date: { gte: isoDate() } } }) };
  });
