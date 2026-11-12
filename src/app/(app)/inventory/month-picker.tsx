'use client';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui';

export function MonthPicker({ month, branch = '' }: { month: string; branch?: string }) {
  const router = useRouter();
  return <Input type="month" value={month} onChange={(e) => e.target.value && router.push(`/inventory?view=month&month=${e.target.value}${branch ? `&branch=${branch}` : ''}`)} className="w-auto" aria-label="Month" />;
}
