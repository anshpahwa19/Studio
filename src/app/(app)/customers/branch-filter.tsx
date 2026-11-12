'use client';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui';

export function BranchFilter({ branches, value, q }: { branches: { id: string; name: string }[]; value: string; q: string }) {
  const router = useRouter();
  return (
    <Select value={value} aria-label="Branch" className="max-w-[240px]" onChange={(e) => {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (e.target.value) p.set('branch', e.target.value);
      router.push(`/customers${p.size ? `?${p}` : ''}`);
    }}>
      <option value="">All branches</option>
      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </Select>
  );
}
