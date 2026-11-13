import { route } from '@/app/api/_lib/handler';
import * as settings from '@/server/features/settings/service';

export const dynamic = 'force-dynamic';

export const POST = route(({ b }) => settings.changeMyPassword(String(b.current ?? ''), String(b.next ?? '')));
