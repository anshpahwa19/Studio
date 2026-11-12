import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { isoDate, money0 } from '@/lib/format';
import { stockByBranch } from '@/lib/stock';
import { PageHeader, Stat } from '@/components/ui';
import { BranchPicker } from './branch-picker';
import { InventoryTable } from './inventory-table';
import { StockTabs } from './stock-tabs';
import { MonthlyPage } from './monthly';

export default async function InventoryPage({ searchParams }: { searchParams: { view?: string; month?: string; stock?: string; branch?: string } }) {
  await requirePage('inventory');
  const branches = await db.branch.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } });
  const branch = branches.some((b) => b.id === searchParams.branch) ? searchParams.branch! : '';
  if (searchParams.view === 'month') return <MonthlyPage branches={branches} branch={branch} month={/^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month ?? '') ? searchParams.month! : isoDate().slice(0, 7)} />;
  const [rows, suppliers] = await Promise.all([
    db.product.findMany({ where: { active: true }, orderBy: { name: 'asc' }, include: { supplierRef: { select: { name: true } } } }),
    db.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  const shelves = await stockByBranch(rows.map((p) => p.id));
  // With a branch chosen the figures are that branch's shelf; otherwise the total across branches.
  const products = rows.map(({ supplierRef, ...p }) => {
    const byBranch = Object.fromEntries(shelves.get(p.id) ?? []);
    return { ...p, supplierName: supplierRef?.name ?? null, byBranch, stock: branch ? byBranch[branch] ?? 0 : p.stock };
  });
  const low = products.filter((p) => p.stock <= p.reorderLevel).length;
  const value = products.reduce((a, p) => a + p.stock * p.costPrice, 0);
  return (
    <>
      <PageHeader title="Inventory & Stock" subtitle={`Retail products and salon supplies. Sales on bills reduce that branch's stock automatically.${branch ? '' : ' Showing all branches combined.'}`} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <StockTabs view="stock" month={isoDate().slice(0, 7)} branch={branch} />
        {branches.length > 0 && <BranchPicker branches={branches} value={branch} />}
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Products" value={products.length} />
        <Stat label="Need reordering" value={low} tone={low ? 'warn' : 'good'} note="At or below reorder level" />
        <Stat label="Stock value at cost" value={money0(value)} />
      </div>
      <InventoryTable suppliers={suppliers} branches={branches} branch={branch} products={products} autoStock={searchParams.stock === '1'} />
    </>
  );
}
