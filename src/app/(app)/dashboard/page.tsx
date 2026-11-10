import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canView } from '@/lib/roles';
import { addDays, fmtDate, fmtDateTime, fmtTime, isoDate, money0, monthStart, plural } from '@/lib/format';
import { BarChart } from '@/components/bar-chart';
import { ApptStatus, Card, Empty, PageHeader, Stat } from '@/components/ui';

const start = (d: string) => new Date(`${d}T00:00:00`);

export default async function Dashboard() {
  const user = await requirePage('dashboard');
  const money = canView(user.role, 'billing');
  const stock = canView(user.role, 'inventory');
  const today = isoDate();
  const from14 = addDays(today, -13);
  const paidFilter = { invoice: { status: { not: 'Void' } } };

  const [appts, payments14, monthPaid, dues, lowStock, newClients, recent] = await Promise.all([
    db.appointment.findMany({
      where: { date: today }, orderBy: { startTime: 'asc' },
      include: { customer: { select: { id: true, name: true } }, staff: { select: { name: true } }, services: { select: { name: true } } },
    }),
    money ? db.payment.findMany({ where: { ...paidFilter, createdAt: { gte: start(from14) } }, select: { amount: true, createdAt: true } }) : [],
    money ? db.payment.aggregate({ where: { ...paidFilter, createdAt: { gte: start(monthStart(today)) } }, _sum: { amount: true } }) : null,
    money ? db.invoice.aggregate({ where: { status: { in: ['Unpaid', 'Partial'] } }, _sum: { total: true, paid: true }, _count: true }) : null,
    stock ? db.product.findMany({ where: { active: true }, select: { stock: true, reorderLevel: true } }) : [],
    db.customer.count({ where: { active: true, createdAt: { gte: start(addDays(today, -29)) } } }),
    money ? db.payment.findMany({ where: paidFilter, orderBy: { createdAt: 'desc' }, take: 6, include: { invoice: { select: { id: true, number: true, customer: { select: { name: true } } } } } }) : [],
  ]);

  const byDay = new Map<string, number>();
  for (const p of payments14) byDay.set(isoDate(p.createdAt), (byDay.get(isoDate(p.createdAt)) ?? 0) + p.amount);
  const chart = Array.from({ length: 14 }, (_, i) => addDays(from14, i)).map((d) => ({ label: fmtDate(d, { day: 'numeric', month: 'short' }), value: byDay.get(d) ?? 0 }));
  const live = appts.filter((a) => !['Cancelled', 'NoShow'].includes(a.status));
  const done = appts.filter((a) => a.status === 'Completed').length;
  const inSalon = appts.filter((a) => a.status === 'CheckedIn' || a.status === 'InService').length;
  const outstanding = dues ? (dues._sum.total ?? 0) - (dues._sum.paid ?? 0) : 0;
  const low = lowStock.filter((p) => p.stock <= p.reorderLevel).length;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name.split(' ')[0]}`}
        subtitle={fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <>
            <Link href="/appointments?book=1" className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] font-medium hover:bg-canvas">Book appointment</Link>
            {money && <Link href="/billing/new" className="rounded-lg bg-plum-600 px-3.5 py-2 text-[13.5px] font-medium text-white hover:bg-plum-700">New bill</Link>}
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Appointments today" value={live.length} note={`${done} done · ${inSalon} in the salon now`} />
        {money ? (
          <>
            <Stat label="Collected today" value={money0(byDay.get(today) ?? 0)} note={`${money0(monthPaid?._sum.amount ?? 0)} this month`} />
            <Stat label="Dues to collect" value={money0(outstanding)} note={`${plural(dues?._count ?? 0, 'bill')} not fully paid`} tone={outstanding > 0.5 ? 'warn' : undefined} />
          </>
        ) : <Stat label="New clients" value={newClients} note="Last 30 days" />}
        {stock ? <Stat label="Products to reorder" value={low} note={<Link href="/inventory" className="hover:underline">Open inventory</Link>} tone={low ? 'warn' : 'good'} />
          : money && <Stat label="New clients" value={newClients} note="Last 30 days" />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card title="Today's schedule" pad={false} actions={<Link href="/appointments" className="text-[13px] font-medium text-plum-600 hover:underline">Open planner</Link>}>
          {appts.length === 0 ? <Empty title="Nothing booked today">Walk-ins can be added from the planner.</Empty> : (
            <ul className="divide-y divide-line">
              {appts.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="tabular w-16 shrink-0 text-[13px] font-semibold">{fmtTime(a.startTime)}</div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/customers/${a.customer.id}`} className="font-medium hover:text-plum-600">{a.customer.name}</Link>
                    <div className="truncate text-[12.5px] text-ink-mute">{a.services.map((s) => s.name).join(', ')} · {a.staff.name}</div>
                  </div>
                  <ApptStatus status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="min-w-0 space-y-6">
          {money && (
            <Card title="Collections, last 14 days">
              <BarChart data={chart} />
            </Card>
          )}
          {money && (
            <Card title="Latest payments" pad={false}>
              {recent.length === 0 ? <Empty title="No payments yet" /> : (
                <ul className="divide-y divide-line">
                  {recent.map((p) => (
                    <li key={p.id}>
                      <Link href={`/billing/${p.invoice.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-canvas/60">
                        <div className="min-w-0"><div className="truncate font-medium">{p.invoice.customer.name}</div><div className="text-[12px] text-ink-mute">{p.invoice.number} · {p.method} · {fmtDateTime(p.createdAt)}</div></div>
                        <span className="tabular font-medium">{money0(p.amount)}</span>
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
