import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
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
  const branches = await db.branch.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } });
  const branch = branches.some((b) => b.id === searchParams.branch) ? searchParams.branch! : '';
  // "Visited" means a bill that is not cancelled, or an appointment that was not cancelled or missed.
  const visitedAppt = { status: { notIn: ['Cancelled', 'NoShow'] } };
  const customers = await db.customer.findMany({
    where: {
      active: true,
      ...(q && { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] }),
      ...(branch && { AND: [{ OR: [{ branchId: branch }, { appointments: { some: { branchId: branch, ...visitedAppt } } }, { invoices: { some: { branchId: branch, status: { not: 'Cancelled' } } } }] }] }),
    },
    orderBy: { name: 'asc' },
    take: 300,
    include: { preferredStaff: { select: { name: true } } },
  });
  const ids = customers.map((c) => c.id);
  const [spend, visits, staff, apptBranches, billBranches] = await Promise.all([
    db.invoice.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, status: { not: 'Cancelled' } }, _sum: { total: true, paid: true } }),
    db.appointment.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, status: 'Completed' }, _count: true, _max: { date: true } }),
    db.staff.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    db.appointment.groupBy({ by: ['customerId', 'branchId'], where: { customerId: { in: ids }, branchId: { not: null }, ...visitedAppt } }),
    db.invoice.groupBy({ by: ['customerId', 'branchId'], where: { customerId: { in: ids }, branchId: { not: null }, status: { not: 'Cancelled' } } }),
  ]);
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const visited = new Map<string, Set<string>>();
  for (const c of customers) { const n = c.branchId && branchName.get(c.branchId); if (n) visited.set(c.id, new Set([n])); }
  for (const r of [...apptBranches, ...billBranches]) {
    const name = branchName.get(r.branchId!);
    if (name) visited.set(r.customerId, (visited.get(r.customerId) ?? new Set()).add(name));
  }
  const spendMap = new Map(spend.map((s) => [s.customerId, s._sum]));
  const visitMap = new Map(visits.map((s) => [s.customerId, s]));

  const FIELDS = ['name', 'stylist', 'branches', 'visits', 'last', 'billed', 'due'];
  const sort = FIELDS.includes(searchParams.sort ?? '') ? searchParams.sort! : 'name';
  const dir: 'asc' | 'desc' = searchParams.dir === 'desc' ? 'desc' : 'asc';
  const keyOf = (c: (typeof customers)[number]): string | number => {
    const s = spendMap.get(c.id);
    switch (sort) {
      case 'stylist': return (c.preferredStaff?.name ?? '').toLowerCase();
      case 'branches': return [...(visited.get(c.id) ?? [])].sort().join(', ').toLowerCase();
      case 'visits': return visitMap.get(c.id)?._count ?? 0;
      case 'last': return visitMap.get(c.id)?._max.date ?? '';
      case 'billed': return s?.total ?? 0;
      case 'due': return (s?.total ?? 0) - (s?.paid ?? 0);
      default: return c.name.toLowerCase();
    }
  };
  // Empty values (no stylist, no visit yet) always go to the bottom, whichever way the column is sorted.
  const empty = (k: string | number) => k === '' ;
  const sorted = [...customers].sort((a, b) => {
    const ka = keyOf(a), kb = keyOf(b);
    if (empty(ka) !== empty(kb)) return empty(ka) ? 1 : -1;
    const r = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
    return (dir === 'asc' ? r : -r) || a.name.localeCompare(b.name);
  });
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
        <div className="ml-auto flex gap-2"><BulkButtons canEdit={canEdit(user.role, 'customers')} downloadHref={`/customers/export?${new URLSearchParams({ ...(q && { q }), ...(branch && { branch }) })}`} /></div>
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
                  const s = spendMap.get(c.id);
                  const v = visitMap.get(c.id);
                  const due = (s?.total ?? 0) - (s?.paid ?? 0);
                  return (
                    <tr key={c.id} className="hover:bg-canvas/60">
                      <td><Link href={`/customers/${c.id}`} className="font-medium text-ink hover:text-plum-600">{c.name}</Link><div className="text-[12.5px] text-ink-mute">{c.phone}</div></td>
                      <td className="text-ink-soft">{c.preferredStaff?.name ?? '—'}</td>
                      <td>{visited.get(c.id) ? <div className="flex flex-wrap gap-1">{[...visited.get(c.id)!].sort().map((n) => <Badge key={n} tone="plum">{n}</Badge>)}</div> : <span className="text-ink-mute">—</span>}</td>
                      <td className="tabular text-right">{v?._count ?? 0}</td>
                      <td className="text-ink-soft">{v?._max.date ? fmtDate(v._max.date) : '—'}</td>
                      <td className="tabular text-right">{money0(s?.total ?? 0)}</td>
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
