import { route } from '@/app/api/_lib/handler';
import * as inventoryReads from '@/server/features/inventory/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => inventoryReads.monthlyStock(q));
