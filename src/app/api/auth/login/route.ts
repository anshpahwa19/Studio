import { route } from '@/app/api/_lib/handler';
import { attempt } from '@/server/api/attempt';
import { login } from '@/server/auth/login';

export const dynamic = 'force-dynamic';

export const POST = route(({ b }) => attempt(() => login(String(b.email ?? ''), String(b.password ?? ''))));
