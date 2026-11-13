import { route } from '@/app/api/_lib/handler';
import * as dashboardReads from '@/server/features/dashboard/queries';

export const dynamic = 'force-dynamic';

export const GET = route(() => dashboardReads.alerts());
