'use client';
import { useEffect } from 'react';
import { call } from '@/lib/api-client';
import { readSession } from '@/lib/client-session';

/** Ends the session once its 12 hours are up, or when the browser no longer has it, and returns to the sign-in page. */
export function SessionGuard() {
  useEffect(() => {
    let leaving = false;
    async function check() {
      if (leaving || readSession()) return;
      leaving = true;
      await call('POST', '/auth/logout');
      window.location.assign('/login');
    }
    check();
    const timer = setInterval(check, 30_000);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', check);
    };
  }, []);
  return null;
}
