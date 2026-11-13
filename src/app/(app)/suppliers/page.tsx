import { api } from '@/server/api/fetch';
import type { listSuppliers } from '@/server/features/suppliers/queries';
import type { DataOf } from '@/client/api-client';
import { requirePage } from '@/server/auth/session';
import { canEdit } from '@/lib/roles';
import { PageHeader } from '@/components/ui';
import { plural } from '@/lib/format';
import { SupplierManager } from './supplier-manager';

export default async function SuppliersPage() {
  const user = await requirePage('suppliers');
  const suppliers = await api<DataOf<typeof listSuppliers>>('/suppliers');
  const rows = suppliers.map(({ createdAt: _c, unitsReceived, lastDelivery, due, ...s }) => ({ ...s, due: Math.max(0, due), units: unitsReceived, lastDelivery: lastDelivery?.toISOString() ?? null }));
  return (
    <>
      <PageHeader title="Suppliers" subtitle={`${plural(rows.filter((r) => r.active).length, 'active supplier')}. Link products to a supplier on the Inventory page, and pick the supplier when you add stock.`} />
      <SupplierManager suppliers={rows} editable={canEdit(user.role, 'suppliers')} />
    </>
  );
}
