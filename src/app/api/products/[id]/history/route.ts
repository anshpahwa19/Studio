import { route } from '@/app/api/_lib/handler';
import * as inventory from '@/server/features/inventory/service';

export const dynamic = 'force-dynamic';

export const GET = route(({ p }) => inventory.stockHistory(p.id));
