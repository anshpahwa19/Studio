import Link from 'next/link';
import { api } from '@/server/api/fetch';
import type { listBranches } from '@/server/features/settings/queries';
import type { listCustomers } from '@/server/features/customers/queries';
import type { listStaff } from '@/server/features/staff/queries';
import type { DataOf } from '@/client/api/call';
import { requirePage } from '@/server/auth/session';
import { canEdit } from '@/lib/roles';
import { fmtDate, money0, plural } from '@/lib/format';
import { Badge, Card, Empty, Input, PageHeader } from '@/components/ui';
import { NewCustomerButton } from './customer-buttons';
import { BulkButtons } from './bulk-buttons';
import { SortHead } from '@/components/sort-head';
import { BranchFilter } from './branch-filter';

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string; new?: string; branch?: string; sort?: string; dir?: string } }) {
  const user = await requirePage('customers');
  const q = searchParams.q?.trim() ?? '';
  const branches = (await api<DataOf<typeof listBranches>>('/branches')).filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }));
  const branch = branches.some((b) => b.id === searchParams.branch) ? searchParams.branch! : '';
  const FIELDS = ['name', 'stylist', 'branches', 'visits', 'last', 'billed', 'due'];
  const sort = FIELDS.includes(searchParams.sort ?? '') ? searchParams.sort! : 'name';
  const dir: 'asc' | 'desc' = searchParams.dir === 'desc' ? 'desc' : 'asc';
  const [{ items: sorted }, staffList] = await Promise.all([
    api<DataOf<typeof listCustomers>>('/customers', { q, branch, sort, dir, limit: 300 }),
    api<DataOf<typeof listStaff>>('/staff'),
  ]);
  const customers = sorted;
  const staff = staffList.map((s) => ({ id: s.id, name: s.name }));
  const keep: Record<string, string> = { ...(q && { q }), ...(branch && { branch }) };

  return (
    <>
      <PageHeader title="Customers (CRM)" subtitle={`${plural(customers.length, q ? 'matching client' : 'active client')} · profiles, visit history and styling notes`} actions={canEdit(user.role, 'customers') && <NewCustomerButton staff={staff} branches={branches} autoOpen={searchParams.new === '1'} />} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="w-full max-w-md">
          {branch && <input type="hidden" name="branch" value={branch} />}
          {searchParams.sort && <input type="hidden" name="sort" value={sort} />}
          {searchParams.sort && <input type="hidden" name="dir" value={dir} />}
          <Input id="q" name="q" defaultValue={q} placeholder="Search by name, mobile or email" aria-label="Search clients" />
        </form>
        {branches.length > 0 && <BranchFilter branches={branches} value={branch} q={q} sort={searchParams.sort ? sort : ''} dir={dir} />}
        <div className="ml-auto flex gap-2"><BulkButtons canEdit={canEdit(user.role, 'customers')} downloadHref={`/api/customers/export?${new URLSearchParams({ ...(q && { q }), ...(branch && { branch }) })}`} /></div>
      </div>
      <Card pad={false}>
        {customers.length === 0 ? (
          <Empty title={q || branch ? 'No clients match that search' : 'No clients yet'}>{q ? 'Try part of the name or the last digits of the mobile number.' : 'Add your first client with New client.'}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr>
                <SortHead base="/customers" label="Client" field="name" sort={sort} dir={dir} params={keep} />
                <SortHead base="/customers" label="Preferred stylist" field="stylist" sort={sort} dir={dir} params={keep} />
                <SortHead base="/customers" label="Branches visited" field="branches" sort={sort} dir={dir} params={keep} />
                <SortHead base="/customers" label="Visits" field="visits" sort={sort} dir={dir} params={keep} right />
                <SortHead base="/customers" label="Last visit" field="last" sort={sort} dir={dir} params={keep} />
                <SortHead base="/customers" label="Billed" field="billed" sort={sort} dir={dir} params={keep} right />
                <SortHead base="/customers" label="Due" field="due" sort={sort} dir={dir} params={keep} right />
              </tr></thead>
              <tbody>
                {sorted.map((c) => {
                  const due = c.due;
                  return (
                    <tr key={c.id} className="hover:bg-canvas/60">
                      <td><Link href={`/customers/${c.id}`} className="font-medium text-ink hover:text-plum-600">{c.name}</Link><div className="text-[12.5px] text-ink-mute">{c.phone}</div></td>
                      <td className="text-ink-soft">{c.preferredStaffName ?? '—'}</td>
                      <td>{c.branchesVisited.length ? <div className="flex flex-wrap gap-1">{c.branchesVisited.map((n) => <Badge key={n} tone="plum">{n}</Badge>)}</div> : <span className="text-ink-mute">—</span>}</td>
                      <td className="tabular text-right">{c.visits}</td>
                      <td className="text-ink-soft">{c.lastVisit ? fmtDate(c.lastVisit) : '—'}</td>
                      <td className="tabular text-right">{money0(c.billed)}</td>
                      <td className={`tabular text-right ${due > 0.5 ? 'font-medium text-amber-700' : 'text-ink-mute'}`}>{due > 0.5 ? money0(due) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
