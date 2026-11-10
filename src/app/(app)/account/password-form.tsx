'use client';
import { useState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { toast } from '@/components/toast';
import { useAction } from '@/components/use-action';
import { changeMyPassword } from '../settings/actions';

export function PasswordForm() {
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const { run, pending } = useAction();
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      if (f.next !== f.confirm) return toast.error('The new passwords do not match.');
      if ((await run(() => changeMyPassword(f.current, f.next), 'Password changed')) !== false) setF({ current: '', next: '', confirm: '' });
    }}>
      <Field label="Current password"><Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required /></Field>
      <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required /></Field>
      <Field label="Type the new password again"><Input type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></Field>
      <Button type="submit" disabled={pending}>Change password</Button>
    </form>
  );
}
