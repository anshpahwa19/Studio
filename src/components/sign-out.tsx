'use client';
import { useFormStatus } from 'react-dom';
import { LogOut } from 'lucide-react';
import { signOut } from '@/app/auth-actions';
import { Modal } from './modal';
import { Button } from './ui';

function Confirm() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Signing out…' : 'Sign out'}</Button>;
}

/** Pop-up that confirms before signing out. */
export function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Sign out?">
      <div className="flex gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100"><LogOut size={20} /></span>
        <p className="text-ink-soft">You&apos;ll need your email and password to sign back in. Anything not yet saved on this screen will be lost.</p>
      </div>
      <form action={signOut} className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Stay signed in</Button>
        <Confirm />
      </form>
    </Modal>
  );
}
