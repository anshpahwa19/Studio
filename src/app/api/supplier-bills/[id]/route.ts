import { route, toForm, withId } from '@/app/api/_lib/handler';
import * as supplierBills from '@/server/features/suppliers/bills';

export const dynamic = 'force-dynamic';

export const PUT = route(({ p, b, form }) => supplierBills.saveBill(withId(form ?? toForm(b), p.id)));
export const DELETE = route(({ p }) => supplierBills.deleteBill(p.id));
