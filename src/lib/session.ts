import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
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

/** A signed token for this user. Used as the login cookie and as the API bearer token. */
export function issueToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export const TOKEN_MAX_AGE = MAX_AGE;

export function startSession(userId: string) {
  cookies().set(COOKIE, issueToken(userId), {
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
  // API clients send "Authorization: Bearer <token>"; the web app uses the cookie.
  const bearer = headers().get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const raw = bearer ?? cookies().get(COOKIE)?.value;
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

/** Looks the signed-in person up in the database. Only the API itself uses this; everything else asks /api/me. */
export async function lookupUser(): Promise<SessionUser | null> {
  const id = readSession();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, active: true } });
  return user?.active ? user : null;
}

/**
 * Who is signed in, for pages and layouts. Asks the API (GET /api/me) with this request's login rather than
 * reading the database. Asked once per request, however many components need it.
 */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  try {
    const res = await fetch(`${h.get('x-forwarded-proto') ?? 'http'}://${host}/api/me`, { headers: { cookie: h.get('cookie') ?? '', authorization: h.get('authorization') ?? '' }, cache: 'no-store' });
    const body = (await res.json()) as { ok: boolean; data?: SessionUser };
    return body.ok && body.data ? body.data : null;
  } catch {
    return null;
  }
});

/** For pages: redirect to login, or to the dashboard if the role may not see this area. */
export async function requirePage(area: Area): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!canView(user.role, area)) redirect('/dashboard');
  return user;
}

/** An expected failure. `status` is the HTTP status the API answers with. */
export class ActionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** For API reads: throw if not signed in or not allowed to see this area. */
export async function requireView(area: Area): Promise<SessionUser> {
  const user = await lookupUser();
  if (!user) throw new ActionError('Your session has ended. Sign in again.', 401);
  if (!canView(user.role, area)) throw new ActionError('Your role cannot see this.', 403);
  return user;
}

/** For server actions: throw if not signed in or not allowed to change this area. */
export async function requireEdit(area: Area): Promise<SessionUser> {
  const user = await lookupUser();
  if (!user) throw new ActionError('Your session has ended. Sign in again.', 401);
  if (!canEdit(user.role, area)) throw new ActionError('Your role cannot make changes here.', 403);
  return user;
}
