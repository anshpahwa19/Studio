import 'server-only';
import { db } from '@/server/db';
import { isoDate, monthEnd } from '@/lib/format';
import { read, str, isDate, type Q } from '@/server/api/helpers';

export const listAttendance = (q: Q) =>
  read('attendance', async () => {
    const month = str(q, 'month');
    const date = isDate(str(q, 'date')) ? str(q, 'date')! : isoDate();
    const from = isDate(str(q, 'from')) ? str(q, 'from')! : month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? `${month}-01` : date;
    const to = isDate(str(q, 'to')) ? str(q, 'to')! : month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? monthEnd(from) : from;
    return db.attendance.findMany({ where: { date: { gte: from, lte: to }, ...(str(q, 'staffId') && { staffId: str(q, 'staffId') }) }, orderBy: [{ date: 'asc' }, { checkIn: 'asc' }], include: { staff: { select: { name: true } } } });
  });
