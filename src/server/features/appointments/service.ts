import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { attempt } from '@/server/api/attempt';
import { ActionError, requireEdit } from '@/server/auth/session';
import { assertSlotFree } from '@/server/features/appointments/schedule';
import { fromMinutes, toMinutes } from '@/lib/format';
import * as v from '@/lib/validate';

const bookSchema = z.object({
  customerId: z.string().min(1, 'choose a client'),
  staffId: z.string().min(1, 'choose a stylist'),
  branchId: v.optional(40),
  date: v.date,
  startTime: v.time,
  serviceIds: z.array(z.string()).min(1, 'add at least one service'),
  walkIn: z.boolean().default(false),
  notes: v.optional(500),
});
export type BookInput = z.input<typeof bookSchema>;

export async function bookAppointment(input: BookInput) {
  return attempt(async () => {
    await requireEdit('appointments');
    const d = bookSchema.parse(input);
    const services = await db.service.findMany({ where: { id: { in: d.serviceIds }, active: true } });
    const ordered = d.serviceIds.map((id) => services.find((s) => s.id === id)).filter((s) => !!s);
    if (ordered.length !== d.serviceIds.length) throw new ActionError('One of the services is no longer offered. Refresh and try again.');
    const endTime = fromMinutes(toMinutes(d.startTime) + ordered.reduce((a, s) => a + s.duration, 0));
    await assertSlotFree({ staffId: d.staffId, date: d.date, start: d.startTime, end: endTime });
    const appt = await db.appointment.create({
      data: {
        customerId: d.customerId, staffId: d.staffId, branchId: d.branchId, date: d.date, startTime: d.startTime, endTime,
        walkIn: d.walkIn, notes: d.notes, status: d.walkIn ? 'CheckedIn' : 'Booked',
        services: { create: ordered.map((s) => ({ serviceId: s.id, name: s.name, price: s.price, duration: s.duration })) },
      },
    });
    revalidatePath('/appointments');
    revalidatePath('/dashboard');
    return { id: appt.id };
  });
}

const NEXT: Record<string, string[]> = {
  Booked: ['CheckedIn', 'Cancelled', 'NoShow'],
  CheckedIn: ['InService', 'Cancelled', 'Booked'],
  InService: ['Completed', 'CheckedIn'],
  Completed: ['InService'],
  Cancelled: ['Booked'],
  NoShow: ['Booked'],
};

export async function setAppointmentStatus(id: string, status: string) {
  return attempt(async () => {
    await requireEdit('appointments');
    const appt = await db.appointment.findUnique({ where: { id }, include: { invoice: { select: { status: true } } } });
    if (!appt) throw new ActionError('This appointment no longer exists.');
    if (!NEXT[appt.status]?.includes(status)) throw new ActionError('That change is not possible from the current status.');
    if (appt.invoice && appt.invoice.status !== 'Cancelled') throw new ActionError('This appointment has been billed. Cancel the bill first to change it.');
    if (status === 'Booked' && (appt.status === 'Cancelled' || appt.status === 'NoShow')) {
      await assertSlotFree({ staffId: appt.staffId, date: appt.date, start: appt.startTime, end: appt.endTime, ignoreId: id });
    }
    await db.appointment.update({ where: { id }, data: { status } });
    revalidatePath('/appointments');
    revalidatePath('/dashboard');
  });
}

const moveSchema = z.object({ id: v.id, staffId: v.id, date: v.date, startTime: v.time });

export async function rescheduleAppointment(input: z.input<typeof moveSchema>) {
  return attempt(async () => {
    await requireEdit('appointments');
    const d = moveSchema.parse(input);
    const appt = await db.appointment.findUnique({ where: { id: d.id } });
    if (!appt) throw new ActionError('This appointment no longer exists.');
    if (!['Booked', 'CheckedIn'].includes(appt.status)) throw new ActionError('Only upcoming appointments can be moved.');
    const endTime = fromMinutes(toMinutes(d.startTime) + toMinutes(appt.endTime) - toMinutes(appt.startTime));
    await assertSlotFree({ staffId: d.staffId, date: d.date, start: d.startTime, end: endTime, ignoreId: d.id });
    await db.appointment.update({ where: { id: d.id }, data: { staffId: d.staffId, date: d.date, startTime: d.startTime, endTime } });
    revalidatePath('/appointments');
    revalidatePath('/dashboard');
  });
}
