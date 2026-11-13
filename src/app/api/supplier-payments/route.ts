import { route } from '@/app/api/_lib/handler';
import * as supplierBills from '@/server/features/suppliers/bills';

export const dynamic = 'force-dynamic';

export const POST = route(({ b }) => supplierBills.addPayment(b));
