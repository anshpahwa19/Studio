import { route } from '@/app/api/_lib/handler';
import * as billingReads from '@/server/features/billing/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ p }) => billingReads.getInvoice(p.id));
