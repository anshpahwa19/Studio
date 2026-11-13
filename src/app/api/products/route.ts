import { route } from '@/app/api/_lib/handler';
import * as inventory from '@/server/features/inventory/service';
import * as inventoryReads from '@/server/features/inventory/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => inventoryReads.listProducts(q));
export const POST = route(({ b }) => inventory.saveProduct(b));
