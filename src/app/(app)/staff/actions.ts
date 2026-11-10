'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { ActionError, requireEdit } from '@/lib/session';
import { isoDate, toMinutes } from '@/lib/format';
import * as v from '@/lib/validate';

const schema = z.object({
  id: z.string().optional(),
  name: v.required(100),
  phone: v.phone,
  email: v.email,
  title: v.required(60),
  skills: v.text(300),
  commissionRate: z.coerce.number().min(0).max(100),
  workDays: z.array(z.number().int().min(0).max(6)).min(1, 'pick at least one working day'),
  startTime: v.time,
  endTime: v.time,
});
export type StaffInput = z.input<typeof schema>;

export async function saveStaff(input: StaffInput) {
  return attempt(async () => {
    await requireEdit('staff');
    const { id, workDays, ...rest } = schema.parse(input);
    if (toMinutes(rest.endTime) <= toMinutes(rest.startTime)) throw new ActionError('The shift must end after it starts.');
    const data = { ...rest, workDays: [...workDays].sort().join(',') };
    if (id) await db.staff.update({ where: { id }, data });
    else await db.staff.create({ data });
    revalidatePath('/staff');
  });
}

export async function archiveStaff(id: string) {
  return attempt(async () => {
    await requireEdit('staff');
    const upcoming = await db.appointment.count({ where: { staffId: id, status: 'Booked', date: { gte: isoDate() } } });
    if (upcoming) throw new ActionError(`Move or cancel their ${upcoming} upcoming appointment${upcoming > 1 ? 's' : ''} first.`);
    await db.staff.update({ where: { id }, data: { active: false } });
    revalidatePath('/staff');
  });
}
