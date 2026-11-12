'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { ActionError, requireEdit } from '@/lib/session';
import { toMinutes } from '@/lib/format';
import * as v from '@/lib/validate';
import { STATUSES } from '@/lib/attendance';

const timeOrBlank = v.time.or(z.literal('')).optional().nullable().transform((t) => t || null);

const schema = z.object({
  staffId: v.id,
  date: v.date,
  status: z.enum(STATUSES),
  checkIn: timeOrBlank,
  checkOut: timeOrBlank,
  note: v.optional(200),
});
export type AttendanceInput = z.input<typeof schema>;

export async function saveAttendance(input: AttendanceInput) {
  return attempt(async () => {
    await requireEdit('attendance');
    const { staffId, date, ...rest } = schema.parse(input);
    if (rest.checkIn && rest.checkOut && toMinutes(rest.checkOut) <= toMinutes(rest.checkIn)) {
      throw new ActionError('Check-out must be after check-in.');
    }
    if (rest.status === 'Leave' || rest.status === 'Absent') { rest.checkIn = null; rest.checkOut = null; }
    const staff = await db.staff.findUnique({ where: { id: staffId }, select: { active: true } });
    if (!staff?.active) throw new ActionError('That staff member is no longer active.');
    await db.attendance.upsert({
      where: { staffId_date: { staffId, date } },
      create: { staffId, date, ...rest },
      update: rest,
    });
    revalidatePath('/attendance');
  });
}

export async function clearAttendance(staffId: string, date: string) {
  return attempt(async () => {
    await requireEdit('attendance');
    v.date.parse(date);
    await db.attendance.deleteMany({ where: { staffId, date } });
    revalidatePath('/attendance');
  });
}

/** Marks everyone who works on that day and has no record yet as Present, at their shift times. */
export async function markAllPresent(date: string) {
  return attempt(async () => {
    await requireEdit('attendance');
    v.date.parse(date);
    const dow = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).getDay();
    const [staff, marked] = await Promise.all([
      db.staff.findMany({ where: { active: true } }),
      db.attendance.findMany({ where: { date }, select: { staffId: true } }),
    ]);
    const done = new Set(marked.map((m) => m.staffId));
    const todo = staff.filter((s) => !done.has(s.id) && s.workDays.split(',').includes(String(dow)));
    if (!todo.length) throw new ActionError('Everyone scheduled that day is already marked.');
    await db.attendance.createMany({ data: todo.map((s) => ({ staffId: s.id, date, status: 'Present', checkIn: s.startTime, checkOut: null })) });
    revalidatePath('/attendance');
    return todo.length;
  });
}
