import { route } from '@/app/api/_lib/handler';
import * as attendance from '@/server/features/attendance/service';

export const dynamic = 'force-dynamic';

export const POST = route(({ b }) => attendance.punchOut(b));
