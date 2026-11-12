import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cx } from '@/components/ui';

/** Reads ?sort and ?dir from the page address, falling back to a default. */
export function readSort(sp: { sort?: string; dir?: string }, fields: string[], fallback: string, fallbackDir: 'asc' | 'desc' = 'asc') {
  const sort = fields.includes(sp.sort ?? '') ? sp.sort! : fallback;
  const dir: 'asc' | 'desc' = sp.dir === 'desc' || sp.dir === 'asc' ? sp.dir : fallbackDir;
  return { sort, dir };
}

/** A table heading that sorts by its column: first click ascending, next click descending. */
export function SortHead({ base, label, field, sort, dir, params, right = false }: { base: string; label: string; field: string; sort: string; dir: 'asc' | 'desc'; params: Record<string, string>; right?: boolean }) {
  const active = sort === field;
  const next = active && dir === 'asc' ? 'desc' : 'asc';
  const qs = new URLSearchParams({ ...params, sort: field, dir: next });
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={right ? 'text-right' : undefined} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <Link href={`${base}?${qs}`} title={`Sort by ${label}, ${next === 'asc' ? 'A to Z / low to high' : 'Z to A / high to low'}`} className={cx('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')}>
        {label}<Icon size={12} className={active ? '' : 'opacity-40'} />
      </Link>
    </th>
  );
}
