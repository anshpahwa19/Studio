import { route } from '@/app/api/_lib/handler';
import * as billing from '@/server/features/billing/service';

export const dynamic = 'force-dynamic';

export const POST = route(({ p, b }) => billing.cancelInvoice(p.id, String(b.reason ?? ''), b.refundMethod ?? null));
