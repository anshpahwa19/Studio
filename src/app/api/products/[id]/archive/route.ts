import { route } from '@/app/api/_lib/handler';
import * as inventory from '@/server/features/inventory/service';

export const dynamic = 'force-dynamic';

export const POST = route(({ p }) => inventory.archiveProduct(p.id));
