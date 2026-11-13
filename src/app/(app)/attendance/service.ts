import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { ActionError, requireEdit } from '@/lib/session';
import { toMinutes } from '@/lib/format';
import * as v from '@/lib/validate';

const base = z.object({ staffId: v.id, date: v.date });
const blankable = v.time.or(z.literal('')).optional().nullable().transform((t) => t || null);

async function activeStaff(id: string) {
  const s = await db.staff.findUnique({ where: { id }, select: { active: true } });
  if (!s?.active) throw new ActionError('That staff member is no longer active.');
}

export async function punchIn(input: { staffId: string; date: string; time: string }) {
  return attempt(async () => {
    await requireEdit('attendance');
    const { staffId, date, time } = base.extend({ time: v.time }).parse(input);
    await activeStaff(staffId);
    if (await db.attendance.findUnique({ where: { staffId_date: { staffId, date } } })) throw new ActionError('Already punched in for this day.');
    await db.attendance.create({ data: { staffId, date, checkIn: time } });
    revalidatePath('/attendance');
  });
}

export async function punchOut(input: { staffId: string; date: string; time: string }) {
  return attempt(async () => {
    await requireEdit('attendance');
    const { staffId, date, time } = base.extend({ time: v.time }).parse(input);
    const rec = await db.attendance.findUnique({ where: { staffId_date: { staffId, date } } });
    if (!rec) throw new ActionError('Punch in first.');
    if (toMinutes(time) <= toMinutes(rec.checkIn)) throw new ActionError('Punch out must be after punch in.');
    await db.attendance.update({ where: { id: rec.id }, data: { checkOut: time } });
    revalidatePath('/attendance');
  });
}

/** Correct or enter times by hand. Clearing the punch-in removes the day (the person counts as absent). */
export async function saveTimes(input: { staffId: string; date: string; checkIn?: string | null; checkOut?: string | null }) {
  return attempt(async () => {
    await requireEdit('attendance');
    const { staffId, date, checkIn, checkOut } = base.extend({ checkIn: blankable, checkOut: blankable }).parse(input);
    if (!checkIn) {
      if (checkOut) throw new ActionError('Enter a punch-in time too.');
      await db.attendance.deleteMany({ where: { staffId, date } });
    } else {
      if (checkOut && toMinutes(checkOut) <= toMinutes(checkIn)) throw new ActionError('Punch out must be after punch in.');
      await activeStaff(staffId);
      await db.attendance.upsert({
        where: { staffId_date: { staffId, date } },
        create: { staffId, date, checkIn, checkOut },
        update: { checkIn, checkOut },
      });
    }
    revalidatePath('/attendance');
  });
}
