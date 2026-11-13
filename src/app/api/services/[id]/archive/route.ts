import { route } from '@/app/api/_lib/handler';
import * as services from '@/server/features/services/service';

export const dynamic = 'force-dynamic';

export const POST = route(({ p }) => services.archiveService(p.id));
