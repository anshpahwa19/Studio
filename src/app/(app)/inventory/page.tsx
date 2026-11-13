import { api } from '@/server/api/fetch';
import type { listBranches } from '@/server/features/settings/queries';
import type { listProducts } from '@/server/features/inventory/queries';
import type { listSuppliers } from '@/server/features/suppliers/queries';
import type { DataOf } from '@/client/api/call';
import { requirePage } from '@/server/auth/session';
import { isoDate, money0 } from '@/lib/format';
import { PageHeader, Stat } from '@/components/ui';
import { BranchPicker } from './branch-picker';
import { InventoryTable } from './inventory-table';
import { StockTabs } from './stock-tabs';
import { MonthlyPage } from './monthly';

export default async function InventoryPage({ searchParams }: { searchParams: { view?: string; month?: string; stock?: string; branch?: string } }) {
  await requirePage('inventory');
  const branches = (await api<DataOf<typeof listBranches>>('/branches')).filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }));
  const branch = branches.some((b) => b.id === searchParams.branch) ? searchParams.branch! : '';
  if (searchParams.view === 'month') return <MonthlyPage branches={branches} branch={branch} month={/^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month ?? '') ? searchParams.month! : isoDate().slice(0, 7)} />;
  // With a branch chosen the stock figures are that branch's shelf; otherwise the total across branches.
  const [{ items: products }, allSuppliers] = await Promise.all([
    api<DataOf<typeof listProducts>>('/products', { branch }),
    api<DataOf<typeof listSuppliers>>('/suppliers'),
  ]);
  const suppliers = allSuppliers.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }));
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
