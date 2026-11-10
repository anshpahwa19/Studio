'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn } from '../auth-actions';
import { Button, Field, Input } from '@/components/ui';

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="w-full">{pending ? 'Signing in…' : 'Sign in'}</Button>;
}

export function LoginForm() {
  const [error, action] = useFormState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email"><Input id="email" name="email" type="email" autoComplete="username" required autoFocus /></Field>
      <Field label="Password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
      <Submit />
    </form>
  );
}
