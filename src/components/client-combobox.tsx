'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, UserPlus } from 'lucide-react';
import { cx } from './ui';

export type ClientOption = { id: string; name: string; phone: string };

const initials = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
const digits = (s: string) => s.replace(/\D/g, '');

/**
 * Searchable client picker. Opens a list of all clients, filters as you type (name or mobile),
 * works with the arrow keys and Enter, and offers "Add new client" at the bottom.
 */
export function ClientCombobox({ clients, value, onChange, onNew, disabled, id = 'client' }: {
  clients: ClientOption[]; value: string; onChange: (id: string) => void;
  onNew?: (text: string) => void; disabled?: boolean; id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = clients.find((c) => c.id === value);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    const d = digits(t);
    const all = [...clients].sort((a, b) => a.name.localeCompare(b.name));
    return t ? all.filter((c) => c.name.toLowerCase().includes(t) || (d.length > 0 && digits(c.phone).includes(d))) : all;
  }, [q, clients]);
  const options = matches.length + (onNew ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    input.current?.focus();
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => setActive(0), [q]);
  useEffect(() => { list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const pick = (i: number) => {
    if (i < matches.length) { onChange(matches[i].id); setOpen(false); setQ(''); }
    else if (onNew) { onNew(q.trim()); setOpen(false); setQ(''); }
  };

  return (
    <div ref={box} className="relative">
      <button type="button" id={id} disabled={disabled} onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}
        className={cx('input flex min-h-[46px] items-center gap-3 text-left', disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-stone-400', open && 'border-violet-500 ring-2 ring-violet-500/20')}>
        {selected ? (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[12px] font-bold text-violet-700">{initials(selected.name)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{selected.name}</span><span className="block text-[12.5px] text-ink-mute">{selected.phone}</span></span>
          </>
        ) : <span className="flex-1 text-ink-mute">Select a client</span>}
        {!disabled && <ChevronDown size={17} className={cx('shrink-0 text-ink-mute transition-transform', open && 'rotate-180')} />}
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <div className="relative border-b border-line p-2">
            <Search size={16} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or mobile" aria-label="Search clients"
              aria-controls={`${id}-list`} aria-activedescendant={`${id}-opt-${active}`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, options - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); if (options) pick(active); }
                else if (e.key === 'Escape') setOpen(false);
              }}
              className="w-full rounded-lg bg-stone-50 py-2 pl-9 pr-3 text-[14px] outline-none ring-1 ring-inset ring-line focus:ring-violet-400" />
          </div>
          <ul ref={list} id={`${id}-list`} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {matches.length === 0 && <li className="px-4 py-3 text-[13.5px] text-ink-mute">No client matches &quot;{q}&quot;.</li>}
            {matches.map((c, i) => (
              <li key={c.id} id={`${id}-opt-${i}`} data-i={i} role="option" aria-selected={c.id === value}
                onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(i); }}
                className={cx('flex cursor-pointer items-center gap-3 px-3 py-2', i === active && 'bg-violet-50')}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[12px] font-bold text-ink-soft">{initials(c.name)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{c.name}</span><span className="block text-[12.5px] text-ink-mute">{c.phone}</span></span>
                {c.id === value && <Check size={16} className="text-violet-600" />}
              </li>
            ))}
          </ul>
          {onNew && (
            <button type="button" data-i={matches.length} id={`${id}-opt-${matches.length}`} onMouseEnter={() => setActive(matches.length)} onMouseDown={(e) => { e.preventDefault(); pick(matches.length); }}
              className={cx('flex w-full items-center gap-2 border-t border-line px-4 py-3 text-left text-[14px] font-semibold text-violet-700', active === matches.length && 'bg-violet-50')}>
              <UserPlus size={17} />{q.trim() ? `Add "${q.trim()}" as a new client` : 'Add new client'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
