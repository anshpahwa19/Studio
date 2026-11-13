import 'server-only';
import { db } from '@/server/db';
import { ActionError } from '@/server/auth/session';
import { round2 } from '@/lib/format';
import { read } from '@/server/api/helpers';

export const listSuppliers = () =>
  read('suppliers', async () => {
    const [list, products, ins, bills] = await Promise.all([
      db.supplier.findMany({ orderBy: { name: 'asc' } }),
      db.product.groupBy({ by: ['supplierId'], where: { active: true, supplierId: { not: null } }, _count: true }),
      db.stockMovement.groupBy({ by: ['supplierId'], where: { type: 'IN', supplierId: { not: null } }, _count: true, _sum: { change: true }, _max: { createdAt: true } }),
      db.supplierBill.groupBy({ by: ['supplierId'], _sum: { amount: true, paid: true } }),
    ]);
    return list.map((s) => ({
      ...s,
      products: products.find((r) => r.supplierId === s.id)?._count ?? 0,
      deliveries: ins.find((r) => r.supplierId === s.id)?._count ?? 0,
      unitsReceived: ins.find((r) => r.supplierId === s.id)?._sum.change ?? 0,
      lastDelivery: ins.find((r) => r.supplierId === s.id)?._max.createdAt ?? null,
      billed: round2(bills.find((r) => r.supplierId === s.id)?._sum.amount ?? 0),
      due: round2((bills.find((r) => r.supplierId === s.id)?._sum.amount ?? 0) - (bills.find((r) => r.supplierId === s.id)?._sum.paid ?? 0)),
    }));
  });

export const getSupplier = (id: string) =>
  read('suppliers', async () => {
    const s = await db.supplier.findUnique({ where: { id } });
    if (!s) throw new ActionError('Supplier not found.', 404);
    const bills = await db.supplierBill.findMany({
      where: { supplierId: id }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, billNumber: true, date: true, dueDate: true, amount: true, paid: true, notes: true, fileName: true, fileType: true, payments: { orderBy: { date: 'asc' } } },
    });
    return { ...s, bills: bills.map((b) => ({ ...b, hasFile: !!b.fileType, due: round2(b.amount - b.paid) })) };
  });
