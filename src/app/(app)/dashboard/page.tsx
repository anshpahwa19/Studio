import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarCheck, CalendarDays, CalendarPlus, CheckCircle2, Clock, IndianRupee, Package, PackagePlus, Receipt, UserPlus, Users, Wallet } from 'lucide-react';
import { api } from '@/server/api/fetch';
import type { dashboard } from '@/server/features/dashboard/queries';
import type { DataOf } from '@/client/api/call';
import { requirePage } from '@/server/auth/session';
import { canView } from '@/lib/roles';
import { fmtDate, fmtDateTime, fmtTime, isoDate, money0, plural, toMinutes } from '@/lib/format';
import { ApptStatus, Card, Empty, IconTile, Pill, Stat, type IconTone } from '@/components/ui';
import { SyncButton } from './sync-button';

export default async function Dashboard() {
  const user = await requirePage('dashboard');
  const money = canView(user.role, 'billing');
  const stock = canView(user.role, 'inventory');
  const spend = canView(user.role, 'expenses');
  const today = isoDate();
  const d = await api<DataOf<typeof dashboard>>('/dashboard');
  const { salon: settings, appointments: { items: appts }, newClients, clientsToday } = d;
  const collected = d.collectedToday ?? 0;
  const billsToday = { length: d.billsToday ?? 0 };
  const recent = d.recentPayments ?? [];
  const live = appts.filter((a) => !['Cancelled', 'NoShow'].includes(a.status));
  const count = (st: string) => d.appointments.byStatus[st] ?? 0;
  const outstanding = d.dueToday ?? 0;
  const dueBills = { length: d.dueBillsToday ?? 0 };
  const low = d.lowStock?.length ?? 0;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isOpen = nowMin >= toMinutes(settings.openTime) && nowMin < toMinutes(settings.closeTime);

  const actions: { href: string; title: string; text: string; tag: string; tone: IconTone; icon: typeof Receipt; show: boolean }[] = [
    { href: '/appointments?book=1', title: 'Book Appointment', text: 'Schedule a client visit with a stylist', tag: 'Calendar', tone: 'violet', icon: CalendarPlus, show: true },
    { href: '/billing/new', title: 'Create POS Bill', text: 'Fast checkout, GST bill & receipt', tag: 'Point of sale', tone: 'green', icon: Receipt, show: money },
    { href: '/customers?new=1', title: 'Add New Client', text: 'Client profile & styling notes', tag: 'CRM', tone: 'blue', icon: UserPlus, show: canView(user.role, 'customers') },
    { href: '/inventory?stock=1', title: 'Add Stock', text: 'Record new stock received & date', tag: 'Inventory', tone: 'teal', icon: PackagePlus, show: stock },
    { href: '/expenses?new=1', title: 'Record Expense', text: 'Supplies, rent & daily payouts', tag: 'Finance', tone: 'red', icon: Wallet, show: spend },
  ];

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

      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
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
          note={<Foot href="/appointments">{count('Completed')} completed • {count('InService')} in progress</Foot>} />
        {money && (
          <Stat label="Revenue collected today" pill="Today" pillTone="green"
            value={money0(collected)} icon={<IndianRupee size={20} />} iconTone="green" note={<Foot href="/billing">{plural(billsToday.length, 'bill')} made today</Foot>} />
        )}
        <Stat label="Clients today" pill="Today" pillTone="blue" value={clientsToday} icon={<Users size={20} />} iconTone="blue"
          note={<Foot href="/customers">Booked or billed today</Foot>} />
        <Stat label="New clients today" pill="Growth" pillTone="amber" value={`+${newClients}`} icon={<UserPlus size={20} />} iconTone="amber"
          note={<Foot href="/customers">Registered today</Foot>} />
        {money && (
          <Stat label="Pending balances today" pill="Receivables" pillTone="red" value={money0(outstanding)} icon={<Clock size={20} />} iconTone="red"
            note={<Foot href="/billing">{plural(dueBills.length, 'bill')} from today not fully paid</Foot>} />
        )}
        {stock ? (
          <Stat label="Products to reorder" pill={low ? 'Low stock' : 'Stocked'} pillTone={low ? 'amber' : 'green'} value={low} icon={<Package size={20} />} iconTone="teal"
            note={<Foot href="/inventory">At or below reorder level</Foot>} />
        ) : (
          <Stat label="Completed sessions" pill="Delivered" pillTone="green" value={count('Completed')} icon={<CheckCircle2 size={20} />} iconTone="teal"
            note={<Foot>Successfully delivered today</Foot>} />
        )}
      </div>

      {money ? (
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
      ) : <TodaySchedule appts={appts} />}
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
