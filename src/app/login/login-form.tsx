'use client';
import { useState } from 'react';
import { call } from '@/client/api-client';
import { saveSession } from '@/client/session';
import { Button, Field, Input } from '@/components/ui';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const res = await call<{ token: string; expiresIn: number }>('POST', '/auth/login', { email: form.get('email'), password: form.get('password') });
    if (res.ok && res.data) {
      saveSession(res.data.token, res.data.expiresIn);
      window.location.assign('/dashboard');
      return;
    }
    setError(res.ok ? 'Could not sign in. Try again.' : res.error);
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email"><Input id="email" name="email" type="email" autoComplete="username" required autoFocus /></Field>
      <Field label="Password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? 'Signing in…' : 'Sign in'}</Button>
    </form>
  );
}
