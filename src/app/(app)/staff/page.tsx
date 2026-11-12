import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { isoDate } from '@/lib/format';
import { PageHeader } from '@/components/ui';
import { StaffManager } from './staff-manager';

export default async function StaffPage() {
  await requirePage('staff');
  const [staff, upcoming] = await Promise.all([
    db.staff.findMany({ orderBy: { name: 'asc' } }),
    db.appointment.groupBy({ by: ['staffId'], where: { status: 'Booked', date: { gte: isoDate() } }, _count: true }),
  ]);
  const counts = new Map(upcoming.map((u) => [u.staffId, u._count]));
  return (
    <>
      <PageHeader title="Staff Management" subtitle="Working days and hours decide when each person can be booked." />
      <StaffManager staff={staff.map((s) => ({ ...s, upcoming: counts.get(s.id) ?? 0 }))} />
    </>
  );
}
