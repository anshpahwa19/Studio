import 'server-only';
import { db } from '@/server/db';
import { ActionError } from '@/server/auth/session';
import { read, type Q } from '@/server/api/helpers';

export const listServices = (q: Q) =>
  read('services', async () => {
    const archived = q.get('archived') === '1';
    return db.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' }, include: { services: { where: archived ? {} : { active: true }, orderBy: { name: 'asc' } } } });
  });

export const getService = (id: string) =>
  read('services', async () => {
    const x = await db.service.findUnique({ where: { id }, include: { category: { select: { name: true } } } });
    if (!x) throw new ActionError('Service not found.', 404);
    return x;
  });
