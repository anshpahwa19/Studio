'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';

export function SyncButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" onClick={() => start(() => router.refresh())} disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2 text-[14px] font-semibold text-ink shadow-sm hover:bg-stone-50 disabled:opacity-60">
      <RefreshCw size={16} className={pending ? 'animate-spin' : ''} />{pending ? 'Syncing…' : 'Sync Data'}
    </button>
  );
}
