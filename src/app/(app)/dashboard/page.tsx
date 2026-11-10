import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarCheck, CalendarDays, CalendarPlus, CheckCircle2, Clock, IndianRupee, Package, Receipt, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canView } from '@/lib/roles';
import { addDays, fmtDate, fmtDateTime, fmtTime, isoDate, money0, monthStart, plural, toMinutes } from '@/lib/format';
import { BarChart } from '@/components/bar-chart';
import { ApptStatus, Card, Empty, IconTile, Pill, Stat, type IconTone } from '@/components/ui';
import { SyncButton } from './sync-button';

const start = (d: string) => new Date(`${d}T00:00:00`);

export default async function Dashboard() {
  const user = await requirePage('dashboard');
  const money = canView(user.role, 'billing');
  const stock = canView(user.role, 'inventory');
  const spend = canView(user.role, 'expenses');
  const today = isoDate();
  const from14 = addDays(today, -13);
  const paidFilter = { invoice: { status: { not: 'Void' } } };

  const [settings, appts, payments14, monthPaid, lastMonthPaid, dues, lowStock, activeClients, newClients, recent] = await Promise.all([
    db.settings.findUniqueOrThrow({ where: { id: 1 } }),
    db.appointment.findMany({
      where: { date: today }, orderBy: { startTime: 'asc' },
      include: { customer: { select: { id: true, name: true } }, staff: { select: { name: true } }, services: { select: { name: true } } },
    }),
    money ? db.payment.findMany({ where: { ...paidFilter, createdAt: { gte: start(from14) } }, select: { amount: true, createdAt: true } }) : [],
    money ? db.payment.aggregate({ where: { ...paidFilter, createdAt: { gte: start(monthStart(today)) } }, _sum: { amount: true } }) : null,
    money ? db.payment.aggregate({ where: { ...paidFilter, createdAt: { gte: start(monthStart(addDays(monthStart(today), -1))), lt: start(monthStart(today)) } }, _sum: { amount: true } }) : null,
    money ? db.invoice.aggregate({ where: { status: { in: ['Unpaid', 'Partial'] } }, _sum: { total: true, paid: true }, _count: true }) : null,
    stock ? db.product.findMany({ where: { active: true }, select: { stock: true, reorderLevel: true } }) : [],
    db.customer.count({ where: { active: true } }),
    db.customer.count({ where: { active: true, createdAt: { gte: start(addDays(today, -29)) } } }),
    money ? db.payment.findMany({ where: paidFilter, orderBy: { createdAt: 'desc' }, take: 6, include: { invoice: { select: { id: true, number: true, customer: { select: { name: true } } } } } }) : [],
  ]);

  const byDay = new Map<string, number>();
  for (const p of payments14) byDay.set(isoDate(p.createdAt), (byDay.get(isoDate(p.createdAt)) ?? 0) + p.amount);
  const chart = Array.from({ length: 14 }, (_, i) => addDays(from14, i)).map((d) => ({ label: fmtDate(d, { day: 'numeric', month: 'short' }), value: byDay.get(d) ?? 0 }));
  const live = appts.filter((a) => !['Cancelled', 'NoShow'].includes(a.status));
  const count = (s: string) => appts.filter((a) => a.status === s).length;
  const outstanding = dues ? (dues._sum.total ?? 0) - (dues._sum.paid ?? 0) : 0;
  const low = lowStock.filter((p) => p.stock <= p.reorderLevel).length;
  const month = monthPaid?._sum.amount ?? 0;
  const last = lastMonthPaid?._sum.amount ?? 0;
  const dayOfMonth = Number(today.slice(8));
  // Compare this month so far with the same number of days last month, pro rata.
  const lastSoFar = last * Math.min(1, dayOfMonth / 30);
  const change = lastSoFar > 0 ? Math.round(((month - lastSoFar) / lastSoFar) * 1000) / 10 : null;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isOpen = nowMin >= toMinutes(settings.openTime) && nowMin < toMinutes(settings.closeTime);

  const actions: { href: string; title: string; text: string; tag: string; tone: IconTone; icon: typeof Receipt; show: boolean }[] = [
    { href: '/appointments?book=1', title: 'Book Appointment', text: 'Schedule a client visit with a stylist', tag: 'Calendar', tone: 'violet', icon: CalendarPlus, show: true },
    { href: '/billing/new', title: 'Create POS Bill', text: 'Fast checkout, GST bill & receipt', tag: 'Point of sale', tone: 'green', icon: Receipt, show: money },
    { href: '/customers?new=1', title: 'Add New Client', text: 'Client profile & styling notes', tag: 'CRM', tone: 'blue', icon: UserPlus, show: canView(user.role, 'customers') },
    { href: '/expenses?new=1', title: 'Record Expense', text: 'Supplies, rent & daily payouts', tag: 'Finance', tone: 'red', icon: Wallet, show: spend },
  ];
  const statuses: [string, string, string][] = [['Booked', 'Booked', '#0ea5e9'], ['CheckedIn', 'Checked in', '#f59e0b'], ['InService', 'In service', '#8b5cf6'], ['Completed', 'Completed', '#10b981'], ['Cancelled', 'Cancelled', '#a8a29e'], ['NoShow', 'No-show', '#f43f5e']];
  const maxStatus = Math.max(1, ...statuses.map(([s]) => count(s)));

  return (
    <>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-ink">{settings.name}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ring-inset ${isOpen ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-stone-100 text-stone-600 ring-stone-200'}`}>
              <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-stone-400'}`} />{isOpen ? 'Studio Open' : 'Studio Closed'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14.5px] text-ink-soft">
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={16} />{fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="hidden text-ink-mute sm:inline">•</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={16} />Hours: {fmtTime(settings.openTime)} – {fmtTime(settings.closeTime)}</span>
          </div>
        </div>
        <SyncButton />
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {actions.filter((a) => a.show).map((a) => (
          <Link key={a.href} href={a.href} className="card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <IconTile tone={a.tone} size="lg"><a.icon size={22} /></IconTile>
              <Pill>{a.tag}</Pill>
            </div>
            <div className="mt-5 text-[17px] font-bold text-ink">{a.title}</div>
            <div className="mb-5 mt-1 text-[14px] text-ink-soft">{a.text}</div>
            <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-[14px] font-medium text-ink-mute group-hover:text-violet-700">
              Open action<ArrowRight size={17} />
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Today's appointments" pill="Live today" pillTone="violet" value={live.length} icon={<CalendarDays size={20} />}
          note={<Foot>{count('Completed')} completed • {count('InService')} in progress</Foot>} />
        {money && (
          <Stat label="Revenue collected" pill={change === null ? 'This month' : `${change >= 0 ? '+' : ''}${change}% MoM`} pillTone={change !== null && change < 0 ? 'red' : 'green'}
            value={money0(month)} icon={<IndianRupee size={20} />} iconTone="green" note={<Foot href="/reports">{money0(byDay.get(today) ?? 0)} collected today</Foot>} />
        )}
        <Stat label="Total active clients" pill="Client base" pillTone="blue" value={activeClients} icon={<Users size={20} />} iconTone="blue"
          note={<Foot href="/customers">Registered client profiles</Foot>} />
        <Stat label="New clients (30 days)" pill="Growth" pillTone="amber" value={`+${newClients}`} icon={<UserPlus size={20} />} iconTone="amber"
          note={<Foot href="/customers">New client acquisition</Foot>} />
        {money && (
          <Stat label="Pending balances" pill="Receivables" pillTone="red" value={money0(outstanding)} icon={<Clock size={20} />} iconTone="red"
            note={<Foot href="/billing">{plural(dues?._count ?? 0, 'bill')} not fully paid</Foot>} />
        )}
        {stock ? (
          <Stat label="Products to reorder" pill={low ? 'Low stock' : 'Stocked'} pillTone={low ? 'amber' : 'green'} value={low} icon={<Package size={20} />} iconTone="teal"
            note={<Foot href="/inventory">At or below reorder level</Foot>} />
        ) : (
          <Stat label="Completed sessions" pill="Delivered" pillTone="green" value={count('Completed')} icon={<CheckCircle2 size={20} />} iconTone="teal"
            note={<Foot>Successfully delivered today</Foot>} />
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        {money ? (
          <Card title="Revenue Overview (14 Days)" subtitle="Daily collected revenue from POS checkout & payments"
            actions={<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"><TrendingUp size={15} />Live Trends</span>}>
            <BarChart data={chart} height={200} />
          </Card>
        ) : <TodaySchedule appts={appts} />}
        <Card title="Appointment Status (Today)" subtitle="Current lifecycle distribution">
          {appts.length === 0 ? <Empty title="No appointments today" /> : (
            <ul className="space-y-4">
              {statuses.map(([s, label, color]) => (
                <li key={s}>
                  <div className="flex justify-between text-[14px]"><span className="font-medium text-ink-soft">{label}</span><span className="tabular font-semibold">{count(s)}</span></div>
                  <div className="mt-1.5 h-2.5 rounded-full bg-stone-100"><div className="h-2.5 rounded-full" style={{ width: `${(count(s) / maxStatus) * 100}%`, background: color }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {money && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
          <TodaySchedule appts={appts} />
          <Card title="Latest Payments" subtitle="Live POS transaction stream" pad={false}>
            {recent.length === 0 ? <Empty title="No payments yet" /> : (
              <ul className="divide-y divide-line">
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link href={`/billing/${p.invoice.id}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-stone-50">
                      <IconTile tone="green"><IndianRupee size={17} /></IconTile>
                      <div className="min-w-0 flex-1"><div className="truncate font-semibold">{p.invoice.customer.name}</div><div className="text-[12.5px] text-ink-mute">{p.invoice.number} · {p.method} · {fmtDateTime(p.createdAt)}</div></div>
                      <span className="tabular font-bold">{money0(p.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function Foot({ children, href }: { children: React.ReactNode; href?: string }) {
  const inner = <span className="flex items-center justify-between gap-2"><span>{children}</span><ArrowUpRight size={16} className="text-ink-mute" /></span>;
  return href ? <Link href={href} className="block hover:text-violet-700">{inner}</Link> : inner;
}

type Appt = { id: string; startTime: string; status: string; customer: { id: string; name: string }; staff: { name: string }; services: { name: string }[] };
function TodaySchedule({ appts }: { appts: Appt[] }) {
  return (
    <Card title="Upcoming & Today's Appointments" subtitle="Client schedule for today" pad={false}
      actions={<Link href="/appointments" className="text-[14px] font-semibold text-violet-600 hover:underline">Open planner</Link>}>
      {appts.length === 0 ? <Empty title="Nothing booked today">Walk-ins can be added from the planner.</Empty> : (
        <ul className="divide-y divide-line">
          {appts.map((a) => (
            <li key={a.id} className="flex items-center gap-4 px-6 py-3.5">
              <IconTile tone="violet"><CalendarCheck size={18} /></IconTile>
              <div className="min-w-0 flex-1">
                <Link href={`/customers/${a.customer.id}`} className="font-semibold hover:text-violet-700">{a.customer.name}</Link>
                <div className="truncate text-[13px] text-ink-mute">{fmtTime(a.startTime)} · {a.services.map((s) => s.name).join(', ')} · {a.staff.name}</div>
              </div>
              <ApptStatus status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
