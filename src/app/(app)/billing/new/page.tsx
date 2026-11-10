import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { PosForm, type PosLine } from './pos-form';

export default async function NewBillPage({ searchParams }: { searchParams: { customer?: string; appointment?: string } }) {
  await requirePage('billing');
  const [customers, services, products, staff, branches, settings] = await Promise.all([
    db.customer.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, phone: true } }),
    db.service.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, price: true } }),
    db.product.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, price: true, stock: true, sku: true } }),
    db.staff.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.branch.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.settings.findUniqueOrThrow({ where: { id: 1 }, select: { gstRate: true } }),
  ]);

  let customerId = searchParams.customer ?? '';
  let branchId = branches[0]?.id ?? '';
  let lines: PosLine[] = [];
  let appointment: { id: string; label: string } | null = null;
  if (searchParams.appointment) {
    const a = await db.appointment.findUnique({
      where: { id: searchParams.appointment },
      include: { services: true, invoice: { select: { id: true } } },
    });
    if (a && !a.invoice) {
      customerId = a.customerId;
      branchId = a.branchId ?? branchId;
      appointment = { id: a.id, label: `${a.date} ${a.startTime}` };
      lines = a.services.map((s, i) => ({ key: `a${i}`, kind: 'service', refId: s.serviceId, name: s.name, qty: 1, unitPrice: s.price, staffId: a.staffId }));
    }
  }

  return (
    <>
      <PageHeader title="New bill" subtitle={appointment ? 'Billing a completed appointment. Services are filled in from the booking.' : `Prices are before GST. GST at ${settings.gstRate}% is added after any discount, or turn it off for this bill.`} />
      <PosForm gstRate={settings.gstRate} customers={customers} services={services} products={products} staff={staff} branches={branches}
        initial={{ customerId, branchId, lines, appointmentId: appointment?.id ?? null }} />
    </>
  );
}
