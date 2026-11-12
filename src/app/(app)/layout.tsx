import { currentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { canView, type Area } from '@/lib/roles';
import { isoDate, plural } from '@/lib/format';
import { Shell } from '@/components/sidebar';

export const dynamic = 'force-dynamic';

const NAV: { href: string; label: string; area: Area }[] = [
  { href: '/dashboard', label: 'Dashboard', area: 'dashboard' },
  { href: '/appointments', label: 'Appointments', area: 'appointments' },
  { href: '/billing', label: 'Billing & POS', area: 'billing' },
  { href: '/customers', label: 'Customers (CRM)', area: 'customers' },
  { href: '/services', label: 'Services & Pricing', area: 'services' },
  { href: '/staff', label: 'Staff Management', area: 'staff' },
  { href: '/attendance', label: 'Staff Attendance', area: 'attendance' },
  { href: '/inventory', label: 'Inventory & Stock', area: 'inventory' },
  { href: '/expenses', label: 'Expenses', area: 'expenses' },
  { href: '/reports', label: 'Reports & Analytics', area: 'reports' },
  { href: '/settings', label: 'Settings & Users', area: 'settings' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const billing = canView(user.role, 'billing');
  const stock = canView(user.role, 'inventory');
  const [settings, waiting, dues, products] = await Promise.all([
    db.settings.findUnique({ where: { id: 1 }, select: { name: true } }),
    db.appointment.count({ where: { date: isoDate(), status: 'CheckedIn' } }),
    billing ? db.invoice.count({ where: { status: { in: ['Unpaid', 'Partial'] } } }) : 0,
    stock ? db.product.findMany({ where: { active: true }, select: { stock: true, reorderLevel: true } }) : [],
  ]);
  const low = products.filter((p) => p.stock <= p.reorderLevel).length;
  const alerts = [
    ...(waiting ? [{ href: '/appointments', text: `${plural(waiting, 'client')} checked in and waiting`, tone: 'violet' as const }] : []),
    ...(dues ? [{ href: '/billing', text: `${plural(dues, 'bill')} with money still due`, tone: 'amber' as const }] : []),
    ...(low ? [{ href: '/inventory', text: `${plural(low, 'product')} to reorder`, tone: 'red' as const }] : []),
  ];
  const items = NAV.filter((n) => canView(user.role, n.area)).map(({ href, label }) => ({ href, label }));
  return (
    <Shell items={items} salon={settings?.name ?? 'Salon'} user={{ name: user.name, role: user.role }} alerts={alerts} canBill={billing} canStock={stock}>
      {children}
    </Shell>
  );
}
