import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canEdit, canView, isSenior } from '@/lib/roles';
import { fmtDate, fmtTime, money, money0 } from '@/lib/format';
import { ApptStatus, Badge, Card, Empty, InvoiceStatus, PageHeader, Stat } from '@/components/ui';
import { EditCustomerButtons } from '../customer-buttons';

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const user = await requirePage('customers');
  const c = await db.customer.findUnique({
    where: { id: params.id },
    include: {
      preferredStaff: { select: { name: true } },
      appointments: { orderBy: [{ date: 'desc' }, { startTime: 'desc' }], take: 50, include: { staff: { select: { name: true } }, services: true, branch: { select: { name: true } } } },
      invoices: { orderBy: { createdAt: 'desc' }, take: 50, include: { branch: { select: { name: true } } } },
    },
  });
  if (!c) notFound();
  const [byApptBranch, byBillBranch, allBranches] = await Promise.all([
    db.appointment.groupBy({ by: ['branchId'], where: { customerId: c.id, status: 'Completed', branchId: { not: null } }, _count: true, _max: { date: true } }),
    db.invoice.groupBy({ by: ['branchId'], where: { customerId: c.id, status: { not: 'Cancelled' }, branchId: { not: null } }, _sum: { total: true } }),
    db.branch.findMany({ select: { id: true, name: true } }),
  ]);
  const branchVisits = allBranches
    .map((b) => ({ name: b.name, visits: byApptBranch.find((x) => x.branchId === b.id)?._count ?? 0, last: byApptBranch.find((x) => x.branchId === b.id)?._max.date ?? null, billed: byBillBranch.find((x) => x.branchId === b.id)?._sum.total ?? 0 }))
    .filter((b) => b.visits || b.billed)
    .sort((a, b) => b.billed - a.billed);
  const staff = await db.staff.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const live = c.invoices.filter((i) => i.status !== 'Cancelled');
  const billed = live.reduce((a, i) => a + i.total, 0);
  const due = live.reduce((a, i) => a + i.total - i.paid, 0);
  const visits = c.appointments.filter((a) => a.status === 'Completed').length;
  const billing = canView(user.role, 'billing');
  const editable = canEdit(user.role, 'customers');

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={<span>{c.phone}{c.email && ` · ${c.email}`}{!c.active && <> · <Badge>Archived</Badge></>}</span>}
        actions={
          <>
            {editable && <Link href={`/appointments?book=1&customer=${c.id}`} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] font-medium hover:bg-canvas">Book appointment</Link>}
            {billing && <Link href={`/billing/new?customer=${c.id}`} className="rounded-lg border border-plum-600 bg-plum-600 px-3.5 py-2 text-[13.5px] font-medium text-white hover:bg-plum-700">New bill</Link>}
            {editable && (
              <EditCustomerButtons
                staff={staff}
                canArchive={isSenior(user.role) && c.active}
                customer={{ id: c.id, name: c.name, phone: c.phone, email: c.email, gender: c.gender, birthday: c.birthday, address: c.address, notes: c.notes, hairNotes: c.hairNotes, nailNotes: c.nailNotes, preferredStaffId: c.preferredStaffId }}
              />
            )}
          </>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Completed visits" value={visits} />
        <Stat label="Total billed" value={money0(billed)} />
        <Stat label="Balance due" value={money0(due)} tone={due > 0.5 ? 'warn' : undefined} />
        <Stat label="Client since" value={fmtDate(c.createdAt, { month: 'short', year: 'numeric' })} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="min-w-0 space-y-6">
        <Card title="Branches visited" pad={false}>
          {branchVisits.length === 0 ? <Empty title="No branch visits yet" /> : (
            <ul className="divide-y divide-line">
              {branchVisits.map((b) => (
                <li key={b.name} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div><div className="font-medium">{b.name}</div><div className="text-[12.5px] text-ink-mute">{b.visits} completed {b.visits === 1 ? 'visit' : 'visits'}{b.last && ` · last ${fmtDate(b.last)}`}</div></div>
                  <span className="tabular text-ink-soft">{money0(b.billed)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Preferences">
          <dl className="space-y-4">
            {[
              ['Hair', c.hairNotes], ['Nails', c.nailNotes], ['Notes', c.notes],
              ['Preferred stylist', c.preferredStaff?.name], ['Birthday', c.birthday && fmtDate(c.birthday, { day: 'numeric', month: 'long' })],
              ['Address', c.address], ['Gender', c.gender],
            ].map(([k, val]) => (
              <div key={k as string}>
                <dt className="text-[12px] font-medium uppercase tracking-wide text-ink-mute">{k}</dt>
                <dd className={`mt-0.5 whitespace-pre-line ${val ? '' : 'text-ink-mute'}`}>{val || 'Not recorded'}</dd>
              </div>
            ))}
          </dl>
        </Card>
        </div>
        <div className="min-w-0 space-y-6">
          <Card title="Appointments" pad={false}>
            {c.appointments.length === 0 ? <Empty title="No appointments yet" /> : (
              <ul className="divide-y divide-line">
                {c.appointments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div className="min-w-0">
                      <div className="font-medium">{a.services.map((s) => s.name).join(', ')}</div>
                      <div className="text-[12.5px] text-ink-mute">{fmtDate(a.date)} · {fmtTime(a.startTime)} · {a.staff.name}{a.branch && ` · ${a.branch.name}`}</div>
                    </div>
                    <ApptStatus status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {billing && (
            <Card title="Bills" pad={false}>
              {c.invoices.length === 0 ? <Empty title="No bills yet" /> : (
                <ul className="divide-y divide-line">
                  {c.invoices.map((i) => (
                    <li key={i.id}>
                      <Link href={`/billing/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas/60">
                        <div><div className="font-medium">{i.number}</div><div className="text-[12.5px] text-ink-mute">{fmtDate(i.createdAt)}{i.branch && ` · ${i.branch.name}`}</div></div>
                        <div className="flex items-center gap-3"><span className="tabular">{money(i.total)}</span><InvoiceStatus status={i.status} /></div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
