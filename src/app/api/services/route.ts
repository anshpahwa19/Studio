import { route } from '@/app/api/_lib/handler';
import * as services from '@/server/features/services/service';
import * as servicesReads from '@/server/features/services/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => servicesReads.listServices(q));
export const POST = route(({ b }) => services.saveService(b));
