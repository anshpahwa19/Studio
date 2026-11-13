import { route } from '@/app/api/_lib/handler';
import * as settings from '@/server/features/settings/service';
import * as settingsReads from '@/server/features/settings/queries';

export const dynamic = 'force-dynamic';

export const GET = route(() => settingsReads.listBranches());
export const POST = route(({ b }) => settings.saveBranch(b));
