import { currentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { canView, type Area } from '@/lib/roles';
import { Sidebar } from '@/components/sidebar';

export const dynamic = 'force-dynamic';

const NAV: { href: string; label: string; area: Area }[] = [
  { href: '/dashboard', label: 'Today', area: 'dashboard' },
  { href: '/appointments', label: 'Appointments', area: 'appointments' },
  { href: '/billing', label: 'Billing', area: 'billing' },
  { href: '/customers', label: 'Clients', area: 'customers' },
  { href: '/services', label: 'Services', area: 'services' },
  { href: '/staff', label: 'Staff', area: 'staff' },
  { href: '/inventory', label: 'Inventory', area: 'inventory' },
  { href: '/expenses', label: 'Expenses', area: 'expenses' },
  { href: '/reports', label: 'Reports', area: 'reports' },
  { href: '/settings', label: 'Settings', area: 'settings' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const settings = await db.settings.findUnique({ where: { id: 1 }, select: { name: true } });
  const items = NAV.filter((n) => canView(user.role, n.area)).map(({ href, label }) => ({ href, label }));
  return (
    <div className="lg:flex">
      <Sidebar items={items} salon={settings?.name ?? 'Salon'} user={{ name: user.name, role: user.role }} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
