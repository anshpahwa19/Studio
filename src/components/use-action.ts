'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from './toast';

type Result<T> = { ok: true; data?: T } | { ok: false; error: string };

/** Calls a server action, shows the outcome as a toast and refreshes the page data. */
export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  async function run<T>(fn: () => Promise<Result<T>>, success?: string): Promise<T | undefined | false> {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error);
        return false;
      }
      if (success) toast.ok(success);
      start(() => router.refresh());
      return res.data;
    } catch {
      toast.error('Could not reach the app server. Check that it is running.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { run, pending: pending || busy };
}
