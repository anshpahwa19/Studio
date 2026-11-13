import { route } from '@/app/api/_lib/handler';
import * as services from '@/server/features/services/service';
import * as servicesReads from '@/server/features/services/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ p }) => servicesReads.getService(p.id));
export const PUT = route(({ p, b }) => services.saveService({ ...b, id: p.id }));
