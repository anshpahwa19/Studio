import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { money0 } from '@/lib/format';
import { PageHeader, Stat } from '@/components/ui';
import { InventoryTable } from './inventory-table';

export default async function InventoryPage() {
  await requirePage('inventory');
  const products = await db.product.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const low = products.filter((p) => p.stock <= p.reorderLevel).length;
  const value = products.reduce((a, p) => a + p.stock * p.costPrice, 0);
  return (
    <>
      <PageHeader title="Inventory" subtitle="Retail products and salon supplies. Sales on bills reduce stock automatically." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Products" value={products.length} />
        <Stat label="Need reordering" value={low} tone={low ? 'warn' : 'good'} note="At or below reorder level" />
        <Stat label="Stock value at cost" value={money0(value)} />
      </div>
      <InventoryTable products={products} />
    </>
  );
}
