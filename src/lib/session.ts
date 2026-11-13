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

export const TOKEN_MAX_AGE = MAX_AGE;

let tableReady: Promise<unknown> | null = null;
/** Databases made before sessions existed (including installed desktop apps) get the table the first time it is needed. */
function ensureSessionTable() {
  tableReady ??= db
    .$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS "Session" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "expiresAt" DATETIME NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE)',
    )
    .then(() => db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")'))
    .catch((e) => { tableReady = null; throw e; });
  return tableReady;
}

/** Starts a session for this user and returns its signed token. The token is only good while its session row exists. */
async function issueToken(userId: string) {
  await ensureSessionTable();
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const expiresAt = new Date(Date.now() + MAX_AGE * 1000);
  const s = await db.session.create({ data: { userId, expiresAt } });
  const payload = Buffer.from(JSON.stringify({ u: userId, s: s.id, e: expiresAt.getTime() })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Signs in: creates the session, sets the login cookie, and returns the token for API clients. */
export async function startSession(userId: string) {
  const token = await issueToken(userId);
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE });
  return token;
}

/** Signs out: cancels this token for good, wherever it was copied to, and clears the cookie. */
export async function endSession() {
  const s = readToken();
  if (s) {
    await ensureSessionTable();
    await db.session.deleteMany({ where: { id: s.sessionId } });
  }
  cookies().delete(COOKIE);
}

/** Cancels every session of a user except (optionally) the current one, e.g. after a password change. */
export async function endOtherSessions(userId: string, keepSessionId?: string) {
  await ensureSessionTable();
  await db.session.deleteMany({ where: { userId, ...(keepSessionId && { id: { not: keepSessionId } }) } });
}

/** The session named by this request's token, if the signature and expiry check out. Not yet checked against the database. */
export function readToken(): { userId: string; sessionId: string } | null {
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
    const { u, s, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof u === 'string' && typeof s === 'string' && e > Date.now() ? { userId: u, sessionId: s } : null;
  } catch {
    return null;
  }
}

export type SessionUser = { id: string; name: string; email: string; role: string };

/** Looks the signed-in person up in the database. Only the API itself uses this; everything else asks /api/me. */
export async function lookupUser(): Promise<SessionUser | null> {
  const t = readToken();
  if (!t) return null;
  await ensureSessionTable();
  // The session must still exist: signing out, a password change or deleting the login all remove it.
  const session = await db.session.findUnique({ where: { id: t.sessionId }, include: { user: { select: { id: true, name: true, email: true, role: true, active: true } } } });
  if (!session || session.userId !== t.userId || session.expiresAt <= new Date() || !session.user.active) return null;
  const { active: _a, ...user } = session.user;
  return user;
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
