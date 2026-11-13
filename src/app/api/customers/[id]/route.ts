import { route } from '@/app/api/_lib/handler';
import * as customers from '@/server/features/customers/service';
import * as customersReads from '@/server/features/customers/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ p }) => customersReads.getCustomer(p.id));
export const PUT = route(({ p, b }) => customers.saveCustomer({ ...b, id: p.id }));
export const DELETE = route(({ p }) => customers.archiveCustomer(p.id));
