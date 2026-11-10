'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3, CalendarDays, LogOut, Menu, Package, Receipt, Scissors, Settings, Sun, UserRound, Users, Wallet, X,
} from 'lucide-react';
import { signOut } from '@/app/auth-actions';
import { cx } from './ui';

const ICONS: Record<string, typeof Sun> = {
  '/dashboard': Sun, '/appointments': CalendarDays, '/billing': Receipt, '/customers': Users, '/services': Scissors,
  '/staff': UserRound, '/inventory': Package, '/expenses': Wallet, '/reports': BarChart3, '/settings': Settings,
};

export function Sidebar({ items, salon, user }: { items: { href: string; label: string }[]; salon: string; user: { name: string; role: string } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <span className="font-display text-[17px]">{salon}</span>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md p-1.5 hover:bg-canvas"><Menu size={20} /></button>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cx(
          'no-print fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between px-5 pb-4 pt-6">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-brass-500">Salon Studio</div>
            <div className="mt-1 font-display text-[17px] leading-snug">{salon}</div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-md p-1 hover:bg-canvas lg:hidden"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {items.map((i) => {
            const Icon = ICONS[i.href] ?? Sun;
            const active = path === i.href || path.startsWith(i.href + '/');
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className={cx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium',
                  active ? 'bg-plum-50 text-plum-700' : 'text-ink-soft hover:bg-canvas hover:text-ink',
                )}
              >
                <Icon size={17} strokeWidth={1.8} />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
          <Link href="/account" onClick={() => setOpen(false)} className="min-w-0 rounded-md hover:text-plum-600" title="My account">
            <div className="truncate text-[13px] font-medium">{user.name}</div>
            <div className="text-[12px] text-ink-mute">{user.role}</div>
          </Link>
          <form action={signOut}>
            <button type="submit" aria-label="Sign out" title="Sign out" className="rounded-md p-1.5 text-ink-mute hover:bg-canvas hover:text-ink"><LogOut size={17} /></button>
          </form>
        </div>
      </aside>
    </>
  );
}
