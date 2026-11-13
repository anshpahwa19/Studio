import { route } from '@/app/api/_lib/handler';
import { attempt } from '@/server/api/attempt';
import { logout } from '@/server/auth/login';

export const dynamic = 'force-dynamic';

export const POST = route(() => attempt(() => logout()));
