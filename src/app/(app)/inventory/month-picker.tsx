'use client';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui';

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  return <Input type="month" value={month} onChange={(e) => e.target.value && router.push(`/inventory?view=month&month=${e.target.value}`)} className="w-auto" aria-label="Month" />;
}
