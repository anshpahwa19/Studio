import { route } from '@/app/api/_lib/handler';
import * as attendance from '@/server/features/attendance/service';
import * as attendanceReads from '@/server/features/attendance/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => attendanceReads.listAttendance(q));
export const PUT = route(({ b }) => attendance.saveTimes(b));
