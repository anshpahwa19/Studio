import { route } from '@/app/api/_lib/handler';
import * as customers from '@/server/features/customers/service';

export const dynamic = 'force-dynamic';

export const POST = route(({ b }) => customers.importCustomers(String(b.csv ?? '')));
