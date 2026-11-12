// Attendance is only punch in and punch out times. A working day with no punch-in is absent.
import { toMinutes } from './format';

export type Day = 'present' | 'in' | 'absent' | 'pending' | 'off' | 'future';

/** Hours between punch in and punch out, or null when either is missing. */
export function hoursWorked(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return null;
  const m = toMinutes(checkOut) - toMinutes(checkIn);
  return m > 0 ? m / 60 : null;
}

/**
 * What a day counts as for one person.
 * present = punched in and out, in = punched in but not out yet, absent = no punch on a working day,
 * pending = today, shift not over and not punched in yet, off = weekly off, future = not happened yet.
 */
export function dayState(o: { date: string; today: string; nowMinutes: number; workDay: boolean; shiftEnd: string; checkIn?: string | null; checkOut?: string | null }): Day {
  if (o.checkIn) return o.checkOut ? 'present' : 'in';
  if (o.date > o.today) return 'future';
  if (!o.workDay) return 'off';
  if (o.date === o.today && o.nowMinutes < toMinutes(o.shiftEnd)) return 'pending';
  return 'absent';
}
