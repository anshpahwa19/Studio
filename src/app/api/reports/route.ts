import { route } from '@/app/api/_lib/handler';
import * as reportsReads from '@/server/features/reports/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => reportsReads.report(q));
