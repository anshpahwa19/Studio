import 'server-only';
import { db } from '@/server/db';
import { canView } from '@/lib/roles';
import { isoDate, round2 } from '@/lib/format';
import { read, sum } from '@/server/api/helpers';

export const dashboard = () =>
  read('dashboard', async (user) => {
    const money = canView(user.role, 'billing');
    const today = isoDate();
    const start = new Date(`${today}T00:00:00`);
    const live = { invoice: { status: { not: 'Cancelled' } } };
    const [appts, payments, refunds, bills, products, newClients, recent, settings] = await Promise.all([
      db.appointment.findMany({ where: { date: today }, orderBy: { startTime: 'asc' }, include: { customer: { select: { id: true, name: true } }, staff: { select: { name: true } }, services: { select: { name: true } } } }),
      money ? db.payment.findMany({ where: { ...live, createdAt: { gte: start } }, select: { amount: true } }) : [],
      money ? db.refund.findMany({ where: { ...live, createdAt: { gte: start } }, select: { amount: true } }) : [],
      db.invoice.findMany({ where: { status: { not: 'Cancelled' }, createdAt: { gte: start } }, select: { customerId: true, total: true, paid: true } }),
      canView(user.role, 'inventory') ? db.product.findMany({ where: { active: true }, select: { name: true, stock: true, reorderLevel: true } }) : [],
      db.customer.count({ where: { active: true, createdAt: { gte: start } } }),
      money ? db.payment.findMany({ where: live, orderBy: { createdAt: 'desc' }, take: 6, include: { invoice: { select: { id: true, number: true, customer: { select: { name: true } } } } } }) : [],
      db.settings.findUniqueOrThrow({ where: { id: 1 }, select: { name: true, openTime: true, closeTime: true } }),
    ]);
    const liveAppts = appts.filter((a) => !['Cancelled', 'NoShow'].includes(a.status));
    const byStatus: Record<string, number> = {};
    for (const a of appts) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    return {
      date: today,
      appointments: { total: appts.length, byStatus, items: appts },
      newClients,
      salon: settings,
      clientsToday: new Set([...liveAppts.map((a) => a.customer.id), ...bills.map((b) => b.customerId)]).size,
      ...(money && { recentPayments: recent, dueBillsToday: bills.filter((b) => b.total - b.paid > 0.5).length, billsToday: bills.length, collectedToday: round2(sum(payments.map((p) => p.amount)) - sum(refunds.map((r) => r.amount))), dueToday: round2(sum(bills.map((b) => Math.max(b.total - b.paid, 0)))) }),
      ...(canView(user.role, 'inventory') && { lowStock: products.filter((p) => p.stock <= p.reorderLevel) }),
    };
  });

/** The numbers behind the sidebar alerts. Counts a person's role cannot see are left out. */
export const alerts = () =>
  read('dashboard', async (user) => {
    const today = isoDate();
    const [settings, waiting, dues, products, supplierBills] = await Promise.all([
      db.settings.findUnique({ where: { id: 1 }, select: { name: true } }),
      db.appointment.count({ where: { date: today, status: 'CheckedIn' } }),
      canView(user.role, 'billing') ? db.invoice.count({ where: { status: { in: ['Unpaid', 'Partial'] } } }) : 0,
      canView(user.role, 'inventory') ? db.product.findMany({ where: { active: true }, select: { stock: true, reorderLevel: true } }) : [],
      canView(user.role, 'suppliers') ? db.supplierBill.findMany({ where: { dueDate: { lt: today } }, select: { amount: true, paid: true } }) : [],
    ]);
    return {
      salon: settings?.name ?? null,
      waiting,
      billsWithDues: dues,
      lowStock: products.filter((p) => p.stock <= p.reorderLevel).length,
      overdueSupplierBills: supplierBills.filter((b) => b.amount - b.paid > 0.005).length,
    };
  });
