import { route } from '@/app/api/_lib/handler';
import * as inventory from '@/server/features/inventory/service';
import * as inventoryReads from '@/server/features/inventory/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ p }) => inventoryReads.getProduct(p.id));
export const PUT = route(({ p, b }) => inventory.saveProduct({ ...b, id: p.id }));
export const DELETE = route(({ p }) => inventory.deleteProduct(p.id));
