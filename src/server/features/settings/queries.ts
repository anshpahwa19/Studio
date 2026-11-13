import 'server-only';
import { db } from '@/server/db';
import { attempt } from '@/server/api/attempt';
import { ActionError, requireView } from '@/server/auth/session';
import { read } from '@/server/api/helpers';

export const listBranches = () => attempt(async () => { await requireView('dashboard'); return db.branch.findMany({ orderBy: { name: 'asc' } }); });

export const getBranch = (id: string) =>
  attempt(async () => {
    await requireView('dashboard');
    const b = await db.branch.findUnique({ where: { id } });
    if (!b) throw new ActionError('Branch not found.', 404);
    return b;
  });

export const getUser = (id: string) =>
  read('settings', async () => {
    const u = await db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, active: true } });
    if (!u) throw new ActionError('Login not found.', 404);
    return u;
  });

export const getSettings = () => read('dashboard', () => db.settings.findUniqueOrThrow({ where: { id: 1 } }));

export const listUsers = () => read('settings', () => db.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }], select: { id: true, name: true, email: true, role: true, active: true } }));
