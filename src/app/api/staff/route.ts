import { route } from '@/app/api/_lib/handler';
import * as staff from '@/server/features/staff/service';
import * as staffReads from '@/server/features/staff/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => staffReads.listStaff(q));
export const POST = route(({ b }) => staff.saveStaff(b));
