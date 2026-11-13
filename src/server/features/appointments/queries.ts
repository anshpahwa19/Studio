import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { ActionError } from '@/server/auth/session';
import { addDays, isoDate, weekStart } from '@/lib/format';
import { read, str, isDate, type Q } from '@/server/api/helpers';

export const listAppointments = (q: Q) =>
  read('appointments', async () => {
    const date = str(q, 'date');
    const from = isDate(str(q, 'from')) ? str(q, 'from')! : isDate(date) ? date! : isoDate();
    const to = isDate(str(q, 'to')) ? str(q, 'to')! : q.get('view') === 'week' ? addDays(weekStart(from), 6) : from;
    const where: Prisma.AppointmentWhereInput = {
      date: { gte: q.get('view') === 'week' ? weekStart(from) : from, lte: to },
      ...(str(q, 'staffId') && { staffId: str(q, 'staffId') }),
      ...(str(q, 'branch') && { branchId: str(q, 'branch') }),
      ...(str(q, 'customerId') && { customerId: str(q, 'customerId') }),
      ...(str(q, 'status') && { status: str(q, 'status') }),
    };
    return db.appointment.findMany({
      where, orderBy: [{ date: 'asc' }, { startTime: 'asc' }], take: 1000,
      include: { branch: { select: { name: true } }, staff: { select: { name: true } }, customer: { select: { id: true, name: true, phone: true } }, services: true, invoice: { select: { id: true, number: true, status: true } } },
    });
  });

export const getAppointment = (id: string) =>
  read('appointments', async () => {
    const a = await db.appointment.findUnique({ where: { id }, include: { branch: true, staff: { select: { id: true, name: true } }, customer: { select: { id: true, name: true, phone: true } }, services: true, invoice: { select: { id: true, number: true, status: true } } } });
    if (!a) throw new ActionError('Appointment not found.', 404);
    return a;
  });
