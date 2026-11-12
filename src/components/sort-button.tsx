'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cx } from '@/components/ui';

/** Sorting for tables that already hold all their rows in the browser. */
export function useSort<T>(keys: Record<string, (row: T) => string | number>, initial: string, initialDir: 'asc' | 'desc' = 'asc') {
  const [sort, setSort] = useState(initial);
  const [dir, setDir] = useState<'asc' | 'desc'>(initialDir);
  const toggle = (field: string) => {
    if (field === sort) setDir(dir === 'asc' ? 'desc' : 'asc');
    else { setSort(field); setDir('asc'); }
  };
  const apply = (rows: T[]) => {
    const key = keys[sort];
    return [...rows].sort((a, b) => {
      const ka = key(a), kb = key(b);
      if ((ka === '') !== (kb === '')) return ka === '' ? 1 : -1; // empty values stay at the bottom
      const r = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
      return dir === 'asc' ? r : -r;
    });
  };
  return { sort, dir, toggle, apply };
}

export function SortTh({ label, field, sort, dir, onSort, right = false }: { label: string; field: string; sort: string; dir: 'asc' | 'desc'; onSort: (f: string) => void; right?: boolean }) {
  const active = sort === field;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={right ? 'text-right' : undefined} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(field)} title={`Sort by ${label}`} className={cx('inline-flex items-center gap-1 font-[inherit] uppercase tracking-[inherit] hover:text-ink', active && 'text-ink')}>
        {label}<Icon size={12} className={active ? '' : 'opacity-40'} />
      </button>
    </th>
  );
}
