import { route } from '@/app/api/_lib/handler';
import * as staff from '@/server/features/staff/service';

export const dynamic = 'force-dynamic';

export const POST = route(({ p }) => staff.restoreStaff(p.id));
