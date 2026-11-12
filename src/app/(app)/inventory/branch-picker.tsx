'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui';

/** Switches the inventory between all branches combined and one branch's shelves. */
export function BranchPicker({ branches, value }: { branches: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <Select value={value} aria-label="Branch" className="w-[230px]" onChange={(e) => {
      const p = new URLSearchParams(params.toString());
      if (e.target.value) p.set('branch', e.target.value); else p.delete('branch');
      router.push(`/inventory${p.size ? `?${p}` : ''}`);
    }}>
      <option value="">All branches combined</option>
      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </Select>
  );
}
