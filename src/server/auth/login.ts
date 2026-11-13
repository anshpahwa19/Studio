import 'server-only';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { db } from '@/server/db';
import { ActionError, endSession, startSession, TOKEN_MAX_AGE } from './session';

// Wrong-password limits. Failures are counted per email and per address for 15 minutes; the counts live in memory,
// so they reset when the app restarts.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_ADDRESS = 20;
const failures = new Map<string, { count: number; since: number }>();

function tally(key: string, max: number, add = false) {
  const now = Date.now();
  let f = failures.get(key);
  if (!f || now - f.since > WINDOW_MS) {
    if (!add) return 0;
    f = { count: 0, since: now };
  }
  if (add) f.count++;
  failures.set(key, f);
  return f.count >= max ? Math.ceil((f.since + WINDOW_MS - now) / 60000) : 0;
}

function address() {
  const h = headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'local').trim();
}

/** Checks the email and password, starts a session, and returns a bearer token for API clients. */
export async function login(email: string, password: string) {
  const e = email.trim().toLowerCase();
  if (!e || !password) throw new ActionError('Enter your email and password.');
  const ip = address();
  const wait = Math.max(tally(`e:${e}`, MAX_PER_EMAIL), tally(`a:${ip}`, MAX_PER_ADDRESS));
  if (wait) throw new ActionError(`Too many wrong attempts. Try again in ${wait} minute${wait > 1 ? 's' : ''}.`, 429);

  const user = await db.user.findUnique({ where: { email: e } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    tally(`e:${e}`, MAX_PER_EMAIL, true);
    tally(`a:${ip}`, MAX_PER_ADDRESS, true);
    throw new ActionError('That email and password do not match.', 401);
  }
  if (!user.active) throw new ActionError('This login has been switched off. Ask the owner to turn it back on.', 403);
  failures.delete(`e:${e}`);
  const token = await startSession(user.id);
  return { token, expiresIn: TOKEN_MAX_AGE, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function logout() {
  await endSession();
}
