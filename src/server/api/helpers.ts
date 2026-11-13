import 'server-only';
import { attempt } from '@/server/api/attempt';
import { requireView, type SessionUser } from '@/server/auth/session';
import type { Area } from '@/lib/roles';

/** Query-string values, e.g. ?q=priya&limit=50. */
export type Q = URLSearchParams;
export const str = (q: Q, k: string) => q.get(k)?.trim() || undefined;
export const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const num = (q: Q, k: string, def: number, max: number) => Math.min(Math.max(Math.floor(Number(q.get(k))) || def, 1), max);
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Checks the person may see this area, then runs the query. */
export const read = <T>(area: Area, fn: (user: SessionUser) => Promise<T>) =>
  attempt(async () => {
    const user = await requireView(area);
    return fn(user);
  });

/** The app has a few hundred rows of each kind, so lists are capped rather than paged. */
export const page = (q: Q) => ({ take: num(q, 'limit', 100, 5000), skip: Math.max(Number(q.get('offset')) || 0, 0) });
