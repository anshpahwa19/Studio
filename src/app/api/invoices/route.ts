import { route } from '@/app/api/_lib/handler';
import * as billing from '@/server/features/billing/service';
import * as billingReads from '@/server/features/billing/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => billingReads.listInvoices(q));
export const POST = route(({ b }) => billing.createInvoice(b));
