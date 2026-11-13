import { route } from '@/app/api/_lib/handler';
import * as suppliers from '@/server/features/suppliers/service';

export const dynamic = 'force-dynamic';

export const POST = route(({ p, b }) => suppliers.setSupplierActive(p.id, b.active === true));
