import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { isoDate, money0 } from '@/lib/format';
import { PageHeader, Stat } from '@/components/ui';
import { InventoryTable } from './inventory-table';
import { StockTabs } from './stock-tabs';
import { MonthlyPage } from './monthly';

export default async function InventoryPage({ searchParams }: { searchParams: { view?: string; month?: string; stock?: string } }) {
  await requirePage('inventory');
  if (searchParams.view === 'month') return <MonthlyPage month={/^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month ?? '') ? searchParams.month! : isoDate().slice(0, 7)} />;
  const products = await db.product.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const low = products.filter((p) => p.stock <= p.reorderLevel).length;
  const value = products.reduce((a, p) => a + p.stock * p.costPrice, 0);
  return (
    <>
      <PageHeader title="Inventory & Stock" subtitle="Retail products and salon supplies. Sales on bills reduce stock automatically." />
      <StockTabs view="stock" month={isoDate().slice(0, 7)} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Products" value={products.length} />
        <Stat label="Need reordering" value={low} tone={low ? 'warn' : 'good'} note="At or below reorder level" />
        <Stat label="Stock value at cost" value={money0(value)} />
      </div>
      <InventoryTable products={products} autoStock={searchParams.stock === '1'} />
    </>
  );
}
