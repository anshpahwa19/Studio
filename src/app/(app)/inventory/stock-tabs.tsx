import Link from 'next/link';
import { cx } from '@/components/ui';

export function StockTabs({ view, month, branch = '' }: { view: 'stock' | 'month'; month: string; branch?: string }) {
  const b = branch ? `branch=${branch}` : '';
  const tabs = [['stock', `/inventory${b ? `?${b}` : ''}`, 'Current stock'], ['month', `/inventory?view=month&month=${month}${b ? `&${b}` : ''}`, 'Monthly stock']] as const;
  return (
    <div className="inline-flex rounded-xl border border-line bg-white p-1">
      {tabs.map(([k, href, label]) => (
        <Link key={k} href={href} className={cx('rounded-lg px-4 py-1.5 text-[14px] font-semibold', view === k ? 'bg-violet-600 text-white' : 'text-ink-soft hover:bg-stone-100')}>{label}</Link>
      ))}
    </div>
  );
}
