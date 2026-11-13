'use client';
// The signed-in session as the browser keeps it: a token and the time it stops working (12 hours after sign-in).
const KEY = 'salon_session';

type Stored = { token: string; expiresAt: number };

export function saveSession(token: string, expiresInSeconds: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, expiresAt: Date.now() + expiresInSeconds * 1000 } satisfies Stored));
  } catch {
    /* Storage can be blocked; the page then asks the person to sign in again. */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** The stored session, or null when there is none or its 12 hours are up (an expired one is removed). */
export function readSession(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (typeof s.token !== 'string' || typeof s.expiresAt !== 'number' || s.expiresAt <= Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}
