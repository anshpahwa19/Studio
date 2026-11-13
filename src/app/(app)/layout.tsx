import { currentUser } from '@/server/auth/session';
import { redirect } from 'next/navigation';
import { api } from '@/server/api/fetch';
import type { alerts as alertsFn } from '@/server/features/dashboard/queries';
import type { DataOf } from '@/client/api-client';
import { canView, type Area } from '@/lib/roles';
import { plural } from '@/lib/format';
import { Shell } from '@/components/sidebar';
import { SessionGuard } from '@/components/session-guard';

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
  { href: '/suppliers', label: 'Suppliers', area: 'suppliers' },
  { href: '/expenses', label: 'Expenses', area: 'expenses' },
  { href: '/reports', label: 'Reports & Analytics', area: 'reports' },
  { href: '/settings', label: 'Settings & Users', area: 'settings' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const billing = canView(user.role, 'billing');
  const stock = canView(user.role, 'inventory');
  const { salon, waiting, billsWithDues: dues, lowStock: low, overdueSupplierBills: overdueBills } = await api<DataOf<typeof alertsFn>>('/alerts');
  const alerts = [
    ...(waiting ? [{ href: '/appointments', text: `${plural(waiting, 'client')} checked in and waiting`, tone: 'violet' as const }] : []),
    ...(dues ? [{ href: '/billing', text: `${plural(dues, 'bill')} with money still due`, tone: 'amber' as const }] : []),
    ...(overdueBills ? [{ href: '/suppliers', text: `${plural(overdueBills, 'supplier bill')} past the pay-by date`, tone: 'red' as const }] : []),
    ...(low ? [{ href: '/inventory', text: `${plural(low, 'product')} to reorder`, tone: 'red' as const }] : []),
  ];
  const items = NAV.filter((n) => canView(user.role, n.area)).map(({ href, label }) => ({ href, label }));
  return (
    <Shell items={items} salon={salon ?? 'Salon'} user={{ name: user.name, role: user.role }} alerts={alerts} canBill={billing} canStock={stock}>
      <SessionGuard />
      {children}
    </Shell>
  );
}
