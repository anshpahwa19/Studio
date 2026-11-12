// Attendance statuses shared by the server actions and the screens.
import { toMinutes } from './format';

export const STATUSES = ['Present', 'HalfDay', 'Leave', 'Absent'] as const;
export type AttendanceStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<AttendanceStatus, string> = { Present: 'Present', HalfDay: 'Half day', Leave: 'On leave', Absent: 'Absent' };
export const STATUS_LETTER: Record<AttendanceStatus, string> = { Present: 'P', HalfDay: 'H', Leave: 'L', Absent: 'A' };
/** How much of a working day each status counts for. */
export const STATUS_WEIGHT: Record<AttendanceStatus, number> = { Present: 1, HalfDay: 0.5, Leave: 0, Absent: 0 };

/** Hours between check-in and check-out, or null when either is missing. */
export function hoursWorked(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return null;
  const m = toMinutes(checkOut) - toMinutes(checkIn);
  return m > 0 ? m / 60 : null;
}
