import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canEdit } from '@/lib/roles';
import { PageHeader } from '@/components/ui';
import { plural } from '@/lib/format';
import { SupplierManager } from './supplier-manager';

export default async function SuppliersPage() {
  const user = await requirePage('suppliers');
  const [suppliers, products, received, bills] = await Promise.all([
    db.supplier.findMany({ orderBy: { name: 'asc' } }),
    db.product.groupBy({ by: ['supplierId'], where: { active: true, supplierId: { not: null } }, _count: true }),
    db.stockMovement.groupBy({ by: ['supplierId'], where: { type: 'IN', supplierId: { not: null } }, _count: true, _sum: { change: true }, _max: { createdAt: true } }),
    db.supplierBill.groupBy({ by: ['supplierId'], _sum: { amount: true, paid: true } }),
  ]);
  const rows = suppliers.map((s) => {
    const r = received.find((x) => x.supplierId === s.id);
    const { createdAt: _c, ...rest } = s;
    return {
      ...rest,
      billed: bills.find((x) => x.supplierId === s.id)?._sum.amount ?? 0,
      due: Math.max(0, (bills.find((x) => x.supplierId === s.id)?._sum.amount ?? 0) - (bills.find((x) => x.supplierId === s.id)?._sum.paid ?? 0)),
      products: products.find((x) => x.supplierId === s.id)?._count ?? 0,
      deliveries: r?._count ?? 0, units: r?._sum.change ?? 0, lastDelivery: r?._max.createdAt?.toISOString() ?? null,
    };
  });
  return (
    <>
      <PageHeader title="Suppliers" subtitle={`${plural(rows.filter((r) => r.active).length, 'active supplier')}. Link products to a supplier on the Inventory page, and pick the supplier when you add stock.`} />
      <SupplierManager suppliers={rows} editable={canEdit(user.role, 'suppliers')} />
    </>
  );
}
