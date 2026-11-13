import { route } from '@/app/api/_lib/handler';
import * as customers from '@/server/features/customers/service';
import * as customersReads from '@/server/features/customers/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => customersReads.listCustomers(q));
export const POST = route(({ b }) => customers.saveCustomer(b));
