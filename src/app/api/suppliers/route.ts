import { route } from '@/app/api/_lib/handler';
import * as suppliers from '@/server/features/suppliers/service';
import * as suppliersReads from '@/server/features/suppliers/queries';

export const dynamic = 'force-dynamic';

export const GET = route(() => suppliersReads.listSuppliers());
export const POST = route(({ b }) => suppliers.saveSupplier(b));
