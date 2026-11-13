import { route } from '@/app/api/_lib/handler';
import * as settings from '@/server/features/settings/service';
import * as settingsReads from '@/server/features/settings/queries';

export const dynamic = 'force-dynamic';

export const GET = route(() => settingsReads.getSettings());
export const PUT = route(({ b }) => settings.saveSettings(b));
