import { route } from '@/app/api/_lib/handler';
import * as supplierBills from '@/server/features/suppliers/bills';

export const dynamic = 'force-dynamic';

export const DELETE = route(({ p }) => supplierBills.deletePayment(p.id));
