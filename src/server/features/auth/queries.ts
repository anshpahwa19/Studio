import 'server-only';
import { db } from '@/server/db';
import { attempt } from '@/server/api/attempt';
import { ActionError, lookupUser } from '@/server/auth/session';
import { page } from '@/server/api/helpers';

export const me = () =>
  attempt(async () => {
    const user = await lookupUser();
    if (!user) throw new ActionError('Your session has ended. Sign in again.', 401);
    return user;
  });

/** The salon's name and address. Shown on the sign-in page, so it needs no login. */
export const branding = () => attempt(async () => {
  const s = await db.settings.findUnique({ where: { id: 1 }, select: { name: true, address: true } });
  return { name: s?.name ?? null, address: s?.address ?? null };
});
