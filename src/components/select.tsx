'use client';
import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type Option = { value: string; label: ReactNode; text: string; disabled?: boolean };
type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

const textOf = (n: ReactNode): string =>
  typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : isValidElement(n) ? textOf((n.props as { children?: ReactNode }).children) : '';

function readOptions(children: ReactNode): Option[] {
  const out: Option[] = [];
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const el = c as ReactElement<OptionProps & { children?: ReactNode }>;
    if (el.type === 'option') {
      const text = textOf(el.props.children);
      out.push({ value: el.props.value !== undefined ? String(el.props.value) : text, label: el.props.children, text, disabled: el.props.disabled });
    } else out.push(...readOptions(el.props.children));
  });
  return out;
}

type SelectProps = {
  children: ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  name?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
};

/**
 * Dropdown styled like the rest of the app (replaces the operating system's menu).
 * Takes the same <option> children and onChange(e => e.target.value) as a native select,
 * submits through a hidden input when given a name, and supports the keyboard:
 * arrows, Enter, Escape, Home/End and typing a letter to jump.
 */
export function Select({ children, value, defaultValue, onChange, name, id, className, disabled, 'aria-label': ariaLabel }: SelectProps) {
  const options = readOptions(children);
  const [inner, setInner] = useState(String(defaultValue ?? options[0]?.value ?? ''));
  const current = value !== undefined ? String(value) : inner;
  const selected = options.find((o) => o.value === current) ?? options[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;

  const choose = (o: Option) => {
    if (o.disabled) return;
    if (value === undefined) setInner(o.value);
    if (o.value !== current) onChange?.({ target: { value: o.value } });
    setOpen(false);
    btn.current?.focus();
  };
  const openList = () => {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const need = Math.min(280, options.length * 40 + 12);
    setUp(window.innerHeight - r.bottom < need + 8 && r.top > need + 8);
  }, [open, options.length]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => { if (open) list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [open, active]);

  const move = (dir: 1 | -1, from = active) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (!options[i].disabled) return setActive(i);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Home') { e.preventDefault(); move(1, -1); }
    else if (e.key === 'End') { e.preventDefault(); move(-1, options.length); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[active]) choose(options[active]); }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const i = options.findIndex((o, j) => j > active && o.text.toLowerCase().startsWith(k));
      const j = i >= 0 ? i : options.findIndex((o) => o.text.toLowerCase().startsWith(k));
      if (j >= 0) setActive(j);
    }
  };

  return (
    <div ref={box} className={`relative ${/(^|\s)w-/.test(className ?? '') ? '' : 'w-full'} ${className ?? ''}`}>
      {name && <input type="hidden" name={name} value={current} />}
      <button ref={btn} type="button" id={id} disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKey}
        className={`input flex items-center justify-between gap-2 text-left ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-stone-400'} ${open ? 'border-violet-500 ring-2 ring-violet-500/20' : ''}`}>
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown size={16} className={`shrink-0 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul ref={list} id={listId} role="listbox" aria-label={ariaLabel} tabIndex={-1}
          className={`absolute left-0 z-40 max-h-[280px] min-w-full overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-xl ring-1 ring-black/5 ${up ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          {options.map((o, i) => {
            const isSel = o.value === current;
            return (
              <li key={`${o.value}-${i}`} data-i={i} role="option" aria-selected={isSel} aria-disabled={o.disabled}
                onMouseEnter={() => !o.disabled && setActive(i)} onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                className={`flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-[14px] ${o.disabled ? 'cursor-not-allowed opacity-40' : ''} ${i === active ? 'bg-violet-50 text-violet-800' : 'text-ink'} ${isSel ? 'font-semibold' : ''}`}>
                <span>{o.label}</span>
                {isSel && <Check size={16} className="text-violet-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
