import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { canEdit, canView, type Area } from './roles';

const COOKIE = 'salon_session';
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET must be set to at least 16 characters.');
  return s;
}

const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url');

export function startSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  cookies().set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function endSession() {
  cookies().delete(COOKIE);
}

function readSession(): string | null {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { u, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof u === 'string' && e > Date.now() ? u : null;
  } catch {
    return null;
  }
}

export type SessionUser = { id: string; name: string; email: string; role: string };

export async function currentUser(): Promise<SessionUser | null> {
  const id = readSession();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, active: true } });
  return user?.active ? user : null;
}

/** For pages: redirect to login, or to the dashboard if the role may not see this area. */
export async function requirePage(area: Area): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!canView(user.role, area)) redirect('/dashboard');
  return user;
}

export class ActionError extends Error {}

/** For server actions: throw if not signed in or not allowed to change this area. */
export async function requireEdit(area: Area): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new ActionError('Your session has ended. Sign in again.');
  if (!canEdit(user.role, area)) throw new ActionError('Your role cannot make changes here.');
  return user;
}
