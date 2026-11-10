import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canEdit } from '@/lib/roles';
import { fmtDate, money0, plural } from '@/lib/format';
import { Card, Empty, Input, PageHeader } from '@/components/ui';
import { NewCustomerButton } from './customer-buttons';

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await requirePage('customers');
  const q = searchParams.q?.trim() ?? '';
  const customers = await db.customer.findMany({
    where: { active: true, ...(q && { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] }) },
    orderBy: { name: 'asc' },
    take: 300,
    include: { preferredStaff: { select: { name: true } } },
  });
  const ids = customers.map((c) => c.id);
  const [spend, visits, staff] = await Promise.all([
    db.invoice.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, status: { not: 'Void' } }, _sum: { total: true, paid: true } }),
    db.appointment.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, status: 'Completed' }, _count: true, _max: { date: true } }),
    db.staff.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  const spendMap = new Map(spend.map((s) => [s.customerId, s._sum]));
  const visitMap = new Map(visits.map((s) => [s.customerId, s]));

  return (
    <>
      <PageHeader title="Clients" subtitle={plural(customers.length, q ? 'matching client' : 'active client')} actions={canEdit(user.role, 'customers') && <NewCustomerButton staff={staff} />} />
      <form className="mb-4 max-w-md">
        <Input id="q" name="q" defaultValue={q} placeholder="Search by name, mobile or email" aria-label="Search clients" />
      </form>
      <Card pad={false}>
        {customers.length === 0 ? (
          <Empty title={q ? 'No clients match that search' : 'No clients yet'}>{q ? 'Try part of the name or the last digits of the mobile number.' : 'Add your first client with New client.'}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Client</th><th>Preferred stylist</th><th className="text-right">Visits</th><th>Last visit</th><th className="text-right">Billed</th><th className="text-right">Due</th></tr></thead>
              <tbody>
                {customers.map((c) => {
                  const s = spendMap.get(c.id);
                  const v = visitMap.get(c.id);
                  const due = (s?.total ?? 0) - (s?.paid ?? 0);
                  return (
                    <tr key={c.id} className="hover:bg-canvas/60">
                      <td><Link href={`/customers/${c.id}`} className="font-medium text-ink hover:text-plum-600">{c.name}</Link><div className="text-[12.5px] text-ink-mute">{c.phone}</div></td>
                      <td className="text-ink-soft">{c.preferredStaff?.name ?? '—'}</td>
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
