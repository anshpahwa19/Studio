import { route } from '@/app/api/_lib/handler';
import * as staff from '@/server/features/staff/service';
import * as staffReads from '@/server/features/staff/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ p }) => staffReads.getStaff(p.id));
export const PUT = route(({ p, b }) => staff.saveStaff({ ...b, id: p.id }));
