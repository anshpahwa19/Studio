import { api } from '@/lib/api-server';
import type { getAppointment, getSettings, listBranches, listCustomers, listProducts, listServices, listStaff } from '@/lib/api-reads';
import type { DataOf } from '@/lib/api-client';
import { requirePage } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { PosForm, type PosLine } from './pos-form';

export default async function NewBillPage({ searchParams }: { searchParams: { customer?: string; appointment?: string } }) {
  await requirePage('billing');
  const [customerList, categories, productList, staffList, allBranches, settings] = await Promise.all([
    api<DataOf<typeof listCustomers>>('/customers', { limit: 5000 }),
    api<DataOf<typeof listServices>>('/services'),
    api<DataOf<typeof listProducts>>('/products'),
    api<DataOf<typeof listStaff>>('/staff'),
    api<DataOf<typeof listBranches>>('/branches'),
    api<DataOf<typeof getSettings>>('/settings'),
  ]);
  const customers = customerList.items.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
  const services = categories.flatMap((c) => c.services.map((s) => ({ id: s.id, name: s.name, price: s.price, duration: s.duration, category: c.name }))).sort((a, b) => a.name.localeCompare(b.name));
  const products = productList.items.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, sku: p.sku, category: p.category, unit: p.unit, byBranch: p.byBranch }));
  const staff = staffList.map((s) => ({ id: s.id, name: s.name }));
  const branches = allBranches.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }));
  let customerId = searchParams.customer ?? '';
  let branchId = branches[0]?.id ?? '';
  let lines: PosLine[] = [];
  let appointment: { id: string; label: string } | null = null;
  if (searchParams.appointment) {
    const a = await api<DataOf<typeof getAppointment>>(`/appointments/${searchParams.appointment}`).catch(() => null);
    if (a && !a.invoice) {
      customerId = a.customerId;
      branchId = a.branchId ?? branchId;
      appointment = { id: a.id, label: `${a.date} ${a.startTime}` };
      lines = a.services.map((s, i) => ({ key: `a${i}`, kind: 'service', refId: s.serviceId, name: s.name, qty: 1, unitPrice: s.price, staffId: a.staffId }));
    }
  }

  return (
    <>
      <PageHeader title="Point of Sale (POS) Counter" subtitle={appointment ? 'Billing a completed appointment. Services are filled in from the booking.' : `Prices are before GST. GST at ${settings.gstRate}% is added after any discount, or turn it off for this bill.`} />
      <PosForm gstRate={settings.gstRate} customers={customers} services={services} products={products} staff={staff} branches={branches}
        initial={{ customerId, branchId, lines, appointmentId: appointment?.id ?? null }} />
    </>
  );
}
