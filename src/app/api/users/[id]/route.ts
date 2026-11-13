import { route } from '@/app/api/_lib/handler';
import * as settings from '@/server/features/settings/service';
import * as settingsReads from '@/server/features/settings/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ p }) => settingsReads.getUser(p.id));
export const PUT = route(({ p, b }) => settings.saveUser({ ...b, id: p.id }));
export const DELETE = route(({ p }) => settings.deleteUser(p.id));
