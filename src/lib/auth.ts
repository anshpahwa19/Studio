import 'server-only';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { ActionError, endSession, issueToken, startSession, TOKEN_MAX_AGE } from './session';

/** Checks the email and password, sets the login cookie, and also returns a bearer token for API clients. */
export async function login(email: string, password: string) {
  const e = email.trim().toLowerCase();
  if (!e || !password) throw new ActionError('Enter your email and password.');
  const user = await db.user.findUnique({ where: { email: e } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ActionError('That email and password do not match.', 401);
  if (!user.active) throw new ActionError('This login has been switched off. Ask the owner to turn it back on.', 403);
  startSession(user.id);
  return { token: issueToken(user.id), expiresIn: TOKEN_MAX_AGE, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export function logout() {
  endSession();
}
