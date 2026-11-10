import 'server-only';
import { db } from './db';
import { ActionError } from './session';
import { dayOfWeek, DAY_NAMES, fmtTime, toMinutes } from './format';

const ACTIVE = ['Booked', 'CheckedIn', 'InService', 'Completed'];

/** Throws a readable error if the stylist is off, outside hours, or already booked. */
export async function assertSlotFree(opts: {
  staffId: string; date: string; start: string; end: string; ignoreId?: string;
}) {
  const [staff, settings] = await Promise.all([
    db.staff.findUnique({ where: { id: opts.staffId } }),
    db.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!staff || !staff.active) throw new ActionError('Choose an active stylist.');

  const s = toMinutes(opts.start);
  const e = toMinutes(opts.end);
  if (e > 24 * 60) throw new ActionError('The services run past midnight. Pick an earlier start.');

  if (settings && (s < toMinutes(settings.openTime) || e > toMinutes(settings.closeTime))) {
    throw new ActionError(`The salon is open ${fmtTime(settings.openTime)} to ${fmtTime(settings.closeTime)}.`);
  }
  const dow = dayOfWeek(opts.date);
  if (!staff.workDays.split(',').map(Number).includes(dow)) {
    throw new ActionError(`${staff.name} does not work on ${DAY_NAMES[dow]}.`);
  }
  if (s < toMinutes(staff.startTime) || e > toMinutes(staff.endTime)) {
    throw new ActionError(`${staff.name} works ${fmtTime(staff.startTime)} to ${fmtTime(staff.endTime)}.`);
  }

  const sameDay = await db.appointment.findMany({
    where: { staffId: opts.staffId, date: opts.date, status: { in: ACTIVE }, id: opts.ignoreId ? { not: opts.ignoreId } : undefined },
    include: { customer: { select: { name: true } } },
  });
  const clash = sameDay.find((a) => s < toMinutes(a.endTime) && e > toMinutes(a.startTime));
  if (clash) {
    throw new ActionError(
      `${staff.name} is already booked ${fmtTime(clash.startTime)} to ${fmtTime(clash.endTime)} with ${clash.customer.name}.`,
    );
  }
}
