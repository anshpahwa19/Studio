import { route } from '@/app/api/_lib/handler';
import * as authReads from '@/server/features/auth/queries';

export const dynamic = 'force-dynamic';

export const GET = route(() => authReads.branding());
