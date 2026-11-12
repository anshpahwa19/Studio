import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canEdit } from '@/lib/roles';
import { fmtDate, money0, plural } from '@/lib/format';
import { Badge, Card, Empty, Input, PageHeader } from '@/components/ui';
import { NewCustomerButton } from './customer-buttons';
import { BranchFilter } from './branch-filter';

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string; new?: string; branch?: string } }) {
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
      ...(branch && { AND: [{ OR: [{ appointments: { some: { branchId: branch, ...visitedAppt } } }, { invoices: { some: { branchId: branch, status: { not: 'Cancelled' } } } }] }] }),
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
  for (const r of [...apptBranches, ...billBranches]) {
    const name = branchName.get(r.branchId!);
    if (name) visited.set(r.customerId, (visited.get(r.customerId) ?? new Set()).add(name));
  }
  const spendMap = new Map(spend.map((s) => [s.customerId, s._sum]));
  const visitMap = new Map(visits.map((s) => [s.customerId, s]));

  return (
    <>
      <PageHeader title="Customers (CRM)" subtitle={`${plural(customers.length, q ? 'matching client' : 'active client')} · profiles, visit history and styling notes`} actions={canEdit(user.role, 'customers') && <NewCustomerButton staff={staff} autoOpen={searchParams.new === '1'} />} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="w-full max-w-md">
          {branch && <input type="hidden" name="branch" value={branch} />}
          <Input id="q" name="q" defaultValue={q} placeholder="Search by name, mobile or email" aria-label="Search clients" />
        </form>
        {branches.length > 0 && <BranchFilter branches={branches} value={branch} q={q} />}
      </div>
      <Card pad={false}>
        {customers.length === 0 ? (
          <Empty title={q || branch ? 'No clients match that search' : 'No clients yet'}>{q ? 'Try part of the name or the last digits of the mobile number.' : 'Add your first client with New client.'}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Client</th><th>Preferred stylist</th><th>Branches visited</th><th className="text-right">Visits</th><th>Last visit</th><th className="text-right">Billed</th><th className="text-right">Due</th></tr></thead>
              <tbody>
                {customers.map((c) => {
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
