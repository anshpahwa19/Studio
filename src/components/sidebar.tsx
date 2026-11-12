'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BarChart3, Bell, CalendarCheck, CalendarDays, CalendarPlus, ChevronDown, ChevronLeft, LayoutDashboard, LogOut, Menu, Package, Plus,
  Receipt, Scissors, Search, Settings, UserCheck, UserPlus, Users, Wallet, X,
} from 'lucide-react';
import { SignOutDialog } from './sign-out';
import { cx } from './ui';

type NavItem = { href: string; label: string };
type Alert = { href: string; text: string; tone: 'amber' | 'red' | 'violet' };

const ICONS: Record<string, typeof Bell> = {
  '/dashboard': LayoutDashboard, '/appointments': CalendarDays, '/billing': Receipt, '/customers': Users, '/services': Scissors,
  '/staff': UserCheck, '/attendance': CalendarCheck, '/inventory': Package, '/expenses': Wallet, '/reports': BarChart3, '/settings': Settings,
};

// Title and subtitle shown in the top bar for each section.
const TITLES: [string, string, string][] = [
  ['/dashboard', 'Executive Dashboard', 'Overview & real-time metrics'],
  ['/appointments', 'Appointments & Scheduling', 'Calendar, bookings & stylist rosters'],
  ['/billing', 'Point of Sale & Invoicing', 'Fast checkout, GST & payments'],
  ['/customers', 'Customer Relationship Management', 'Client profiles & styling notes'],
  ['/services', 'Services & Pricing', 'Treatment menu, prices & durations'],
  ['/staff', 'Staff Management', 'Team, working hours & pay'],
  ['/attendance', 'Staff Attendance', 'Daily check-in & monthly summary'],
  ['/inventory', 'Inventory & Stock', 'Products, stock levels & reorders'],
  ['/expenses', 'Business Expenses', 'Daily costs & vendor payments'],
  ['/reports', 'Reports & Analytics', 'Profit & loss, performance & exports'],
  ['/settings', 'Settings & Users', 'Business profile, GST & logins'],
  ['/account', 'My Account', 'Your login and password'],
];

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

export function Shell({ items, salon, user, alerts, canBill, children }: {
  items: NavItem[]; salon: string; user: { name: string; role: string }; alerts: Alert[]; canBill: boolean; children: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem('sidebar-collapsed') === '1'); } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem('sidebar-collapsed', c ? '0' : '1'); } catch {}
      return !c;
    });
  };
  const title = TITLES.find(([p]) => path === p || path.startsWith(p + '/')) ?? TITLES[0];
  const [first, ...rest] = salon.split(' ');

  return (
    <div className="lg:flex">
      {open && <div className="no-print fixed inset-0 z-40 bg-stone-900/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cx(
          'no-print fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-line bg-white transition-all lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lg:w-[84px]',
        )}
      >
        <div className={cx('flex h-[72px] items-center gap-3 border-b border-line px-5', collapsed && 'lg:justify-center lg:px-0')}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-sm">
            <Scissors size={19} />
          </span>
          <div className={cx('min-w-0 flex-1', collapsed && 'lg:hidden')}>
            <div className="truncate text-[15px] font-bold text-ink">{first} {rest.slice(0, 1).join(' ')}</div>
            <div className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-violet-600">{rest.slice(1).join(' ') || 'Salon'}</div>
          </div>
          <button type="button" onClick={toggle} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            className={cx('hidden rounded-md p-1 text-ink-mute hover:bg-stone-100 hover:text-ink lg:block', collapsed && 'lg:hidden')}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-md p-1 hover:bg-stone-100 lg:hidden"><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <div className={cx('mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-mute', collapsed && 'lg:hidden')}>Operations & Management</div>
          <div className="space-y-1">
            {items.map((i) => {
              const Icon = ICONS[i.href] ?? LayoutDashboard;
              const active = path === i.href || path.startsWith(i.href + '/');
              return (
                <Link key={i.href} href={i.href} onClick={() => setOpen(false)} title={collapsed ? i.label : undefined}
                  className={cx(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
                    active ? 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200' : 'text-ink-soft hover:bg-stone-100 hover:text-ink',
                    collapsed && 'lg:justify-center lg:px-0',
                  )}>
                  {active && <span className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-violet-600" />}
                  <Icon size={20} strokeWidth={1.8} className={active ? 'text-violet-600' : 'text-ink-mute group-hover:text-ink-soft'} />
                  <span className={cx(collapsed && 'lg:hidden')}>{i.label}</span>
                </Link>
              );
            })}
          </div>
          {collapsed && (
            <button type="button" onClick={toggle} aria-label="Expand menu" className="mt-4 hidden w-full justify-center rounded-xl py-2 text-ink-mute hover:bg-stone-100 lg:flex">
              <ChevronLeft size={18} className="rotate-180" />
            </button>
          )}
        </nav>

        <div className={cx('flex items-center gap-3 border-t border-line px-5 py-4', collapsed && 'lg:flex-col lg:px-0')}>
          <Link href="/account" onClick={() => setOpen(false)} title="My account" className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-[14px] font-bold text-white">{initials(user.name)}</span>
            <span className={cx('min-w-0', collapsed && 'lg:hidden')}>
              <span className="block truncate text-[14px] font-semibold text-ink">{user.name}</span>
              <span className="block text-[12.5px] font-medium text-violet-600">{user.role}</span>
            </span>
          </Link>
          <button type="button" onClick={() => setSigningOut(true)} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-ink-mute hover:bg-stone-100 hover:text-ink"><LogOut size={18} /></button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <TopBar title={title[1]} subtitle={title[2]} onMenu={() => setOpen(true)} alerts={alerts} user={user} canBill={canBill} onSignOut={() => setSigningOut(true)} />
        <main className="px-4 py-6 sm:px-8 lg:py-8">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
      <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
    </div>
  );
}

function useOutside(close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', f);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('keydown', k); };
  }, [close]);
  return ref;
}

function TopBar({ title, subtitle, onMenu, alerts, user, canBill, onSignOut }: {
  title: string; subtitle: string; onMenu: () => void; alerts: Alert[]; user: { name: string; role: string }; canBill: boolean; onSignOut: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState<'quick' | 'bell' | 'user' | null>(null);
  const close = () => setMenu(null);
  const ref = useOutside(close);
  const quick = [
    { href: '/appointments?book=1', label: 'Book appointment', icon: CalendarPlus },
    ...(canBill ? [{ href: '/billing/new', label: 'Create bill', icon: Receipt }] : []),
    { href: '/customers?new=1', label: 'Add new client', icon: UserPlus },
    { href: '/expenses?new=1', label: 'Record expense', icon: Wallet },
  ];

  return (
    <header ref={ref} className="no-print sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex h-[72px] items-center gap-3 px-4 sm:px-8">
        <button type="button" onClick={onMenu} aria-label="Open menu" className="rounded-lg p-2 hover:bg-stone-100 lg:hidden"><Menu size={20} /></button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[19px] font-bold leading-tight text-ink">{title}</div>
          <div className="hidden truncate text-[13px] text-ink-mute sm:block">{subtitle}</div>
        </div>

        <form className="relative hidden w-72 md:block" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/customers?q=${encodeURIComponent(q.trim())}`); }}>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients, phone…" aria-label="Search all clients"
            className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-9 pr-3 text-[14px] placeholder:text-ink-mute focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        </form>

        <div className="relative">
          <button type="button" onClick={() => setMenu(menu === 'quick' ? null : 'quick')} aria-expanded={menu === 'quick'}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-[14px] font-semibold text-white shadow-sm hover:bg-violet-700 sm:px-4">
            <Plus size={17} /><span className="hidden sm:inline">Quick Action</span><ChevronDown size={16} className="hidden sm:block" />
          </button>
          {menu === 'quick' && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
              {quick.map((x) => (
                <Link key={x.href} href={x.href} onClick={close} className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-ink-soft hover:bg-violet-50 hover:text-violet-700">
                  <x.icon size={17} />{x.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button type="button" onClick={() => setMenu(menu === 'bell' ? null : 'bell')} aria-label={`Notifications${alerts.length ? ` (${alerts.length})` : ''}`}
            className="relative rounded-xl p-2 text-ink-soft hover:bg-stone-100">
            <Bell size={20} />
            {alerts.length > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-violet-600 ring-2 ring-white" />}
          </button>
          {menu === 'bell' && (
            <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
              <div className="border-b border-line px-4 py-3 text-[13px] font-bold text-ink">Needs attention</div>
              {alerts.length === 0 ? <p className="px-4 py-4 text-[13.5px] text-ink-mute">You're all caught up.</p> : alerts.map((a) => (
                <Link key={a.text} href={a.href} onClick={close} className="flex items-center gap-3 border-b border-line px-4 py-3 text-[13.5px] text-ink-soft last:border-b-0 hover:bg-stone-50">
                  <span className={cx('h-2 w-2 shrink-0 rounded-full', a.tone === 'red' ? 'bg-rose-500' : a.tone === 'amber' ? 'bg-amber-500' : 'bg-violet-500')} />
                  {a.text}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button type="button" onClick={() => setMenu(menu === 'user' ? null : 'user')} aria-label="Account menu" className="flex items-center gap-1 rounded-xl p-1 hover:bg-stone-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-[13px] font-bold text-white">{initials(user.name)}</span>
            <ChevronDown size={16} className="hidden text-ink-mute sm:block" />
          </button>
          {menu === 'user' && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
              <div className="border-b border-line px-4 py-3"><div className="truncate text-[14px] font-semibold">{user.name}</div><div className="text-[12.5px] text-violet-600">{user.role}</div></div>
              <Link href="/account" onClick={close} className="block px-4 py-2.5 text-[14px] text-ink-soft hover:bg-stone-50">My account</Link>
              <button type="button" onClick={() => { close(); onSignOut(); }} className="w-full px-4 py-2.5 text-left text-[14px] text-ink-soft hover:bg-stone-50">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
