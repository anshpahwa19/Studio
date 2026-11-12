import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canEdit } from '@/lib/roles';
import { dayOfWeek, fmtDate, isoDate, monthEnd } from '@/lib/format';
import { PageHeader } from '@/components/ui';
import { AttendanceView, type Row } from './attendance-view';

const isDate = (s?: string) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '');
const isMonth = (s?: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s ?? '');

export default async function AttendancePage({ searchParams }: { searchParams: { view?: string; date?: string; month?: string } }) {
  const user = await requirePage('attendance');
  const today = isoDate();
  const view = searchParams.view === 'month' ? 'month' : 'day';
  const date = isDate(searchParams.date) ? searchParams.date! : today;
  const month = isMonth(searchParams.month) ? searchParams.month! : today.slice(0, 7);
  const from = view === 'month' ? `${month}-01` : date;
  const to = view === 'month' ? monthEnd(from) : date;

  const [staff, records] = await Promise.all([
    db.staff.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    db.attendance.findMany({ where: { date: { gte: from, lte: to } } }),
  ]);
  const rows: Row[] = staff.map((s) => ({
    id: s.id, name: s.name, title: s.title, workDays: s.workDays.split(',').map(Number), startTime: s.startTime, endTime: s.endTime,
    records: records.filter((r) => r.staffId === s.id).map((r) => ({ date: r.date, status: r.status as Row['records'][number]['status'], checkIn: r.checkIn, checkOut: r.checkOut, note: r.note })),
  }));

  return (
    <>
      <PageHeader
        title="Staff Attendance"
        subtitle={view === 'month' ? fmtDate(from, { month: 'long', year: 'numeric' }) : `${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek(date)]}`}
      />
      <AttendanceView view={view} date={date} month={month} today={today} rows={rows} editable={canEdit(user.role, 'attendance')} />
    </>
  );
}
