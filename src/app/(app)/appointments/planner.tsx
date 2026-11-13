'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { ApptStatus, Button, Card, Empty, Field, Input, PageHeader, Select, Textarea, apptLabel, cx } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/client/use-action';
import { toast } from '@/components/toast';
import { addDays, dayOfWeek, fmtDate, fmtDuration, fmtTime, fromMinutes, isoDate, money0, toMinutes, weekStart } from '@/lib/format';
import { bookAppointment, rescheduleAppointment, setAppointmentStatus } from '@/client/api/appointments';
import { saveCustomer } from '@/client/api/customers';
import { ClientCombobox } from '@/components/client-combobox';
import { phoneProps } from '@/lib/validate';

type Appt = {
  id: string; date: string; startTime: string; endTime: string; status: string; walkIn: boolean; branch: { name: string } | null; notes: string | null; staffId: string;
  customer: { id: string; name: string; phone: string }; services: { name: string; price: number }[]; invoice: { id: string; status: string } | null;
};
type Staff = { id: string; name: string; title: string; workDays: string; startTime: string; endTime: string };
type Service = { id: string; name: string; price: number; duration: number; category: string };
type Customer = { id: string; name: string; phone: string; preferredStaffId: string | null };
type Branch = { id: string; name: string };

type Props = {
  date: string; view: 'day' | 'week'; appointments: Appt[]; staff: Staff[]; services: Service[]; customers: Customer[];
  branches: Branch[]; hours: { open: string; close: string }; editable: boolean; canBill: boolean; bookFor: string | null;
};

const PX_PER_MIN = 1.5;
const BLOCK: Record<string, string> = {
  Booked: 'border-sky-300 border-l-sky-500 bg-sky-50 text-sky-950',
  CheckedIn: 'border-amber-300 border-l-amber-500 bg-amber-50 text-amber-950',
  InService: 'border-violet-300 border-l-violet-600 bg-violet-50 text-violet-950',
  Completed: 'border-emerald-300 border-l-emerald-500 bg-emerald-50 text-emerald-950',
  Cancelled: 'border-stone-200 border-l-stone-300 bg-stone-50 text-stone-400 line-through',
  NoShow: 'border-red-200 border-l-red-300 bg-red-50 text-red-400 line-through',
};
const DOT: Record<string, string> = { Booked: 'bg-sky-500', CheckedIn: 'bg-amber-500', InService: 'bg-violet-600', Completed: 'bg-emerald-500', Cancelled: 'bg-stone-300', NoShow: 'bg-red-300' };
const STATUS_ORDER = ['Booked', 'CheckedIn', 'InService', 'Completed', 'Cancelled', 'NoShow'];

/** Puts overlapping bookings of one stylist side by side instead of on top of each other. */
function lanes(list: Appt[]) {
  const sorted = [...list].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(a.endTime) - toMinutes(b.endTime));
  const out = new Map<string, { lane: number; of: number }>();
  let group: { a: Appt; lane: number }[] = [];
  let groupEnd = -1;
  const flush = () => { const of = Math.max(1, ...group.map((g) => g.lane + 1)); group.forEach((g) => out.set(g.a.id, { lane: g.lane, of })); group = []; };
  for (const a of sorted) {
    if (group.length && toMinutes(a.startTime) >= groupEnd) { flush(); groupEnd = -1; }
    const busy = new Set(group.filter((g) => toMinutes(g.a.endTime) > toMinutes(a.startTime)).map((g) => g.lane));
    let lane = 0; while (busy.has(lane)) lane++;
    group.push({ a, lane });
    groupEnd = Math.max(groupEnd, toMinutes(a.endTime));
  }
  flush();
  return out;
}

type Draft = { customerId: string; staffId: string; date: string; startTime: string; serviceIds: string[]; branchId: string; walkIn: boolean; notes: string };

export function Planner(p: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Appt | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const newDraft = (over: Partial<Draft> = {}): Draft => ({
    customerId: '', staffId: p.staff[0]?.id ?? '', date: p.date, startTime: nextSlot(p.date, p.hours.open), serviceIds: [],
    branchId: p.branches[0]?.id ?? '', walkIn: false, notes: '', ...over,
  });

  useEffect(() => {
    if (p.bookFor !== null && p.editable) {
      const c = p.customers.find((x) => x.id === p.bookFor);
      setDraft(newDraft({ customerId: c?.id ?? '', staffId: c?.preferredStaffId ?? p.staff[0]?.id ?? '' }));
    }
    // Only when the page is opened with ?book=1
  }, [p.bookFor]);

  const go = (date: string, view = p.view) => router.push(`/appointments?date=${date}&view=${view}`);
  const step = p.view === 'week' ? 7 : 1;
  const today = isoDate();
  const title = p.view === 'week'
    ? `${fmtDate(weekStart(p.date), { day: 'numeric', month: 'short' })} – ${fmtDate(addDays(weekStart(p.date), 6))}`
    : fmtDate(p.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const live = p.appointments.filter((a) => a.status !== 'Cancelled' && a.status !== 'NoShow');

  return (
    <>
      <PageHeader
        title="Appointments & Scheduling"
        subtitle={`${title} · ${live.length} booked`}
        actions={p.editable && <Button onClick={() => setDraft(newDraft())}><Plus size={16} />Book appointment</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-white">
          <button type="button" aria-label="Previous" onClick={() => go(addDays(p.date, -step))} className="px-2 py-2 hover:bg-canvas"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => go(today)} className={cx('border-x border-line px-3 py-1.5 text-[13px] font-medium hover:bg-canvas', p.date === today && 'text-violet-600')}>Today</button>
          <button type="button" aria-label="Next" onClick={() => go(addDays(p.date, step))} className="px-2 py-2 hover:bg-canvas"><ChevronRight size={16} /></button>
        </div>
        <Input type="date" value={p.date} onChange={(e) => e.target.value && go(e.target.value)} className="w-auto" aria-label="Go to date" />
        <div className="ml-auto flex rounded-lg border border-line bg-white p-0.5">
          {(['day', 'week'] as const).map((v) => (
            <button key={v} type="button" onClick={() => go(p.date, v)} aria-pressed={p.view === v}
              className={cx('rounded-md px-3 py-1 text-[13px] font-medium capitalize', p.view === v ? 'bg-plum-600 text-white' : 'text-ink-soft hover:bg-canvas')}>{v}</button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-soft">
        {STATUS_ORDER.map((st) => {
          const n = p.appointments.filter((a) => a.status === st).length;
          return <span key={st} className="inline-flex items-center gap-1.5"><span className={cx('h-2.5 w-2.5 rounded-full', DOT[st])} />{apptLabel(st)}<b className="text-ink">{n}</b></span>;
        })}
      </div>

      {p.staff.length === 0 ? (
        <Card><Empty title="No stylists set up">Add your team on the Staff page before booking.</Empty></Card>
      ) : p.view === 'day' ? (
        <DayGrid {...p} onOpen={setSelected} onSlot={(staffId, startTime) => p.editable && setDraft(newDraft({ staffId, startTime }))} />
      ) : (
        <WeekList {...p} onOpen={setSelected} onDay={(d) => go(d, 'day')} />
      )}

      <AppointmentDetail appt={selected} onClose={() => setSelected(null)} {...p} />
      <Modal open={!!draft} onClose={() => setDraft(null)} title="Book appointment" wide>
        {draft && <BookingForm initial={draft} {...p} onDone={(date) => { setDraft(null); if (date && date !== p.date && p.view === 'day') go(date); }} />}
      </Modal>
    </>
  );
}

function nextSlot(date: string, open: string) {
  if (date !== isoDate()) return open;
  const now = new Date();
  const m = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
  return fromMinutes(Math.min(Math.max(m, toMinutes(open)), 23 * 60));
}

function DayGrid({ date, appointments, staff, hours, onOpen, onSlot }: Props & { onOpen: (a: Appt) => void; onSlot: (staffId: string, time: string) => void }) {
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const height = (close - open) * PX_PER_MIN;
  const dow = dayOfWeek(date);
  const hoursList: number[] = [];
  for (let m = Math.ceil(open / 60) * 60; m <= close; m += 60) hoursList.push(m);

  return (
    <div className="card overflow-x-auto">
      <div className="flex" style={{ minWidth: 64 + staff.length * 220 }}>
        <div className="w-16 shrink-0 border-r border-line">
          <div className="h-12 border-b border-line" />
          <div className="relative" style={{ height }}>
            {hoursList.map((m) => (
              <div key={m} className="absolute right-2 -translate-y-1/2 text-[11px] text-ink-mute" style={{ top: (m - open) * PX_PER_MIN }}>
                {fmtTime(fromMinutes(m)).replace(':00', '')}
              </div>
            ))}
          </div>
        </div>
        {staff.map((s) => {
          const works = s.workDays.split(',').map(Number).includes(dow);
          const list = appointments.filter((a) => a.staffId === s.id);
          const layout = lanes(list);
          return (
            <div key={s.id} className="min-w-[220px] flex-1 border-r border-line last:border-r-0">
              <div className="flex h-12 flex-col justify-center border-b border-line px-3">
                <div className="truncate text-[13px] font-semibold">{s.name}</div>
                <div className="truncate text-[11.5px] text-ink-mute">{works ? `${fmtTime(s.startTime)} – ${fmtTime(s.endTime)}` : 'Day off'}</div>
              </div>
              <div
                className={cx('relative', !works && 'bg-[repeating-linear-gradient(135deg,#f7f5f8,#f7f5f8_6px,#efebf1_6px,#efebf1_12px)]')}
                style={{ height }}
                onClick={(e) => {
                  if (!works || e.target !== e.currentTarget) return;
                  const y = e.nativeEvent.offsetY / PX_PER_MIN;
                  onSlot(s.id, fromMinutes(open + Math.floor(y / 15) * 15));
                }}
              >
                {hoursList.map((m) => <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: (m - open) * PX_PER_MIN }} />)}
                {works && <>
                  <div className="pointer-events-none absolute inset-x-0 top-0 bg-canvas/80" style={{ height: Math.max(0, toMinutes(s.startTime) - open) * PX_PER_MIN }} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-canvas/80" style={{ height: Math.max(0, close - toMinutes(s.endTime)) * PX_PER_MIN }} />
                </>}
                {list.map((a) => {
                  const top = (toMinutes(a.startTime) - open) * PX_PER_MIN;
                  const h = Math.max(30, (toMinutes(a.endTime) - toMinutes(a.startTime)) * PX_PER_MIN - 2);
                  const l = layout.get(a.id) ?? { lane: 0, of: 1 };
                  const dead = a.status === 'Cancelled' || a.status === 'NoShow';
                  return (
                    <button key={a.id} type="button" onClick={() => onOpen(a)}
                      className={cx('absolute overflow-hidden rounded-md border border-l-4 px-2 py-1 text-left text-[12.5px] leading-snug shadow-sm hover:z-20 hover:shadow-md', BLOCK[a.status], dead && 'opacity-80')}
                      style={{ top, height: h, left: `calc(${(l.lane / l.of) * 100}% + 4px)`, width: `calc(${100 / l.of}% - 8px)` }}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-[13px] font-semibold">{a.customer.name}</span>
                        {h > 44 && <span className="shrink-0 rounded bg-white/70 px-1 text-[10.5px] font-semibold no-underline">{apptLabel(a.status)}</span>}
                      </div>
                      {h > 40 && <div className="truncate font-medium opacity-90">{fmtTime(a.startTime)} – {fmtTime(a.endTime)}{h <= 52 && a.branch ? ` · ${a.branch.name}` : ''}</div>}
                      {h > 52 && a.branch && <div className="truncate text-[11.5px] font-semibold opacity-80">{a.branch.name}</div>}
                      {h > 56 && <div className="truncate opacity-90">{a.services.map((x) => x.name).join(', ')}</div>}
                      {h > 72 && <div className="truncate opacity-75">{a.customer.phone}{a.walkIn ? ' · Walk-in' : ''}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="border-t border-line px-4 py-2 text-[12px] text-ink-mute">Click an empty time in a stylist&apos;s column to book that slot. Click a booking to see the client, services and update its status.</p>
    </div>
  );
}

function WeekList({ date, appointments, staff, onOpen, onDay }: Props & { onOpen: (a: Appt) => void; onDay: (d: string) => void }) {
  const start = weekStart(date);
  const names = new Map(staff.map((s) => [s.id, s.name]));
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => {
        const list = appointments.filter((a) => a.date === d);
        return (
          <section key={d} className={cx('card min-w-0', d === isoDate() && 'border-plum-200')}>
            <button type="button" onClick={() => onDay(d)} className="flex w-full items-center justify-between border-b border-line px-4 py-2.5 text-left hover:bg-canvas/60">
              <span className="font-semibold">{fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span className="text-[12px] text-ink-mute">{list.filter((a) => !['Cancelled', 'NoShow'].includes(a.status)).length} booked</span>
            </button>
            {list.length === 0 ? <p className="px-4 py-4 text-[13px] text-ink-mute">No appointments</p> : (
              <ul className="divide-y divide-line">
                {list.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onOpen(a)} className="w-full px-4 py-2 text-left hover:bg-canvas/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="tabular text-[12.5px] font-medium">{fmtTime(a.startTime)}</span>
                        <ApptStatus status={a.status} />
                      </div>
                      <div className="truncate text-[13px] font-medium">{a.customer.name}</div>
                      <div className="truncate text-[12px] text-ink-mute">{names.get(a.staffId)} · {a.services.map((s) => s.name).join(', ')}</div>
                      {a.branch && <div className="truncate text-[11.5px] font-medium text-violet-700">{a.branch.name}</div>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

const ACTIONS: Record<string, { to: string; label: string; variant?: 'primary' | 'secondary' | 'danger' }[]> = {
  Booked: [{ to: 'CheckedIn', label: 'Check in' }, { to: 'NoShow', label: 'Mark no-show', variant: 'secondary' }, { to: 'Cancelled', label: 'Cancel booking', variant: 'danger' }],
  CheckedIn: [{ to: 'InService', label: 'Start service' }, { to: 'Booked', label: 'Undo check-in', variant: 'secondary' }, { to: 'Cancelled', label: 'Cancel booking', variant: 'danger' }],
  InService: [{ to: 'Completed', label: 'Mark completed' }, { to: 'CheckedIn', label: 'Back to checked in', variant: 'secondary' }],
  Completed: [],
  Cancelled: [{ to: 'Booked', label: 'Restore booking', variant: 'secondary' }],
  NoShow: [{ to: 'Booked', label: 'Restore booking', variant: 'secondary' }],
};

function AppointmentDetail({ appt, onClose, staff, editable, canBill }: Props & { appt: Appt | null; onClose: () => void }) {
  const { run, pending } = useAction();
  const [move, setMove] = useState<{ staffId: string; date: string; startTime: string } | null>(null);
  useEffect(() => setMove(null), [appt]);
  if (!appt) return null;
  const total = appt.services.reduce((a, s) => a + s.price, 0);
  const stylist = staff.find((s) => s.id === appt.staffId)?.name ?? 'Former staff';
  const billed = appt.invoice && appt.invoice.status !== 'Cancelled';

  return (
    <Modal open onClose={onClose} title={appt.customer.name}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ApptStatus status={appt.status} />
          {appt.walkIn && <span className="text-[12px] text-ink-mute">Walk-in</span>}
          <Link href={`/customers/${appt.customer.id}`} className="ml-auto text-[13px] font-medium text-violet-600 hover:underline">Client profile</Link>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-[13.5px]">
          <div><dt className="text-ink-mute">When</dt><dd className="font-medium">{fmtDate(appt.date, { weekday: 'short', day: 'numeric', month: 'short' })}, {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}</dd></div>
          <div><dt className="text-ink-mute">Stylist</dt><dd className="font-medium">{stylist}</dd></div>
          {appt.branch && <div><dt className="text-ink-mute">Branch</dt><dd className="font-medium">{appt.branch.name}</dd></div>}
          <div><dt className="text-ink-mute">Mobile</dt><dd>{appt.customer.phone}</dd></div>
          <div><dt className="text-ink-mute">Service value</dt><dd className="tabular">{money0(total)} + GST</dd></div>
        </dl>
        <ul className="rounded-lg border border-line">
          {appt.services.map((s, i) => <li key={i} className="flex justify-between border-b border-line px-3 py-2 last:border-b-0"><span>{s.name}</span><span className="tabular text-ink-soft">{money0(s.price)}</span></li>)}
        </ul>
        {appt.notes && <p className="rounded-lg bg-canvas px-3 py-2 text-[13px] text-ink-soft">{appt.notes}</p>}

        {move && (
          <form className="grid grid-cols-3 gap-3 rounded-lg border border-line p-3" onSubmit={async (e) => {
            e.preventDefault();
            if ((await run(() => rescheduleAppointment({ id: appt.id, ...move }), 'Appointment moved')) !== false) onClose();
          }}>
            <Field label="Date"><Input type="date" value={move.date} onChange={(e) => setMove({ ...move, date: e.target.value })} required /></Field>
            <Field label="Start"><Input type="time" step={900} value={move.startTime} onChange={(e) => setMove({ ...move, startTime: e.target.value })} required /></Field>
            <Field label="Stylist"><Select value={move.staffId} onChange={(e) => setMove({ ...move, staffId: e.target.value })}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <div className="col-span-3 flex justify-end gap-2"><Button variant="secondary" onClick={() => setMove(null)}>Cancel</Button><Button type="submit" disabled={pending}>Save new time</Button></div>
          </form>
        )}

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          {editable && !billed && ACTIONS[appt.status].map((a) => (
            <Button key={a.to} variant={a.variant ?? 'primary'} disabled={pending}
              onClick={async () => { if ((await run(() => setAppointmentStatus(appt.id, a.to), `Marked ${apptLabel(a.to).toLowerCase()}`)) !== false) onClose(); }}>
              {a.label}
            </Button>
          ))}
          {editable && !move && ['Booked', 'CheckedIn'].includes(appt.status) && (
            <Button variant="secondary" onClick={() => setMove({ staffId: appt.staffId, date: appt.date, startTime: appt.startTime })}>Reschedule</Button>
          )}
          {canBill && appt.status === 'Completed' && !billed && (
            <Link href={`/billing/new?appointment=${appt.id}`} className="rounded-lg bg-plum-600 px-3.5 py-2 text-[13.5px] font-medium text-white hover:bg-plum-700">Create bill</Link>
          )}
          {canBill && billed && (
            <Link href={`/billing/${appt.invoice!.id}`} className="rounded-lg border border-line px-3.5 py-2 text-[13.5px] font-medium hover:bg-canvas">View bill</Link>
          )}
        </div>
      </div>
    </Modal>
  );
}

function BookingForm({ initial, services, customers, staff, branches, onDone }: Props & { initial: Draft; onDone: (date?: string) => void }) {
  const [d, setD] = useState(initial);
  const [newClient, setNewClient] = useState<{ name: string; phone: string; gender: string } | null>(null);
  const [svcQ, setSvcQ] = useState('');
  const { run, pending } = useAction();

  const chosen = d.serviceIds.map((id) => services.find((s) => s.id === id)!).filter(Boolean);
  const duration = chosen.reduce((a, s) => a + s.duration, 0);
  const price = chosen.reduce((a, s) => a + s.price, 0);
  const svcList = services.filter((s) => !d.serviceIds.includes(s.id) && (s.name + s.category).toLowerCase().includes(svcQ.toLowerCase()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let customerId = d.customerId;
    if (newClient) {
      const c = await run(() => saveCustomer(newClient));
      if (!c) return;
      customerId = c.id;
    }
    if (!customerId) return toast.error('Choose a client or add a new one.');
    const r = await run(() => bookAppointment({ ...d, customerId, branchId: d.branchId || null }), 'Appointment booked');
    if (r !== false) onDone(d.date);
  }

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <div>
          <span className="label">Client</span>
          {newClient ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <div className="mb-3 text-[13.5px] font-semibold text-violet-700">New client · saved with the booking</div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Full name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} required aria-label="New client name" autoFocus />
                <Input {...phoneProps} placeholder="Mobile number" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} required aria-label="New client mobile" />
                <Select value={newClient.gender} onChange={(e) => setNewClient({ ...newClient, gender: e.target.value })} aria-label="New client gender"><option value="" disabled>Gender</option><option>Female</option><option>Male</option><option>Other</option></Select>
              </div>
              <button type="button" onClick={() => setNewClient(null)} className="mt-3 text-[13px] font-medium text-violet-700 hover:underline">Choose an existing client instead</button>
            </div>
          ) : (
            <ClientCombobox id="book-client" clients={customers} value={d.customerId}
              onChange={(id) => { const c = customers.find((x) => x.id === id); setD({ ...d, customerId: id, staffId: c?.preferredStaffId && staff.some((s) => s.id === c.preferredStaffId) ? c.preferredStaffId : d.staffId }); }}
              onNew={(text) => { const digits = /\d{4,}/.test(text); setNewClient({ name: digits ? '' : text, phone: digits ? text : '', gender: '' }); }} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} required /></Field>
          <Field label="Start time"><Input type="time" step={900} value={d.startTime} onChange={(e) => setD({ ...d, startTime: e.target.value })} required /></Field>
          <Field label="Stylist"><Select aria-label="Stylist" value={d.staffId} onChange={(e) => setD({ ...d, staffId: e.target.value })}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          {branches.length > 0 && (
            <Field label="Branch"><Select value={d.branchId} onChange={(e) => setD({ ...d, branchId: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
          )}
        </div>
        <label className="flex items-center gap-2 text-[13.5px]">
          <input type="checkbox" checked={d.walkIn} onChange={(e) => setD({ ...d, walkIn: e.target.checked })} className="h-4 w-4 accent-plum-600" />
          Walk-in (client is here now, mark as checked in)
        </label>
        <Field label="Notes"><Textarea value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} placeholder="Colour formula, requests, anything the stylist should know" /></Field>
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="label">Services</span>
        <ul className="mb-2 space-y-1">
          {chosen.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg bg-plum-50 px-3 py-1.5 text-[13px]">
              <span className="min-w-0 truncate">{s.name}</span>
              <span className="flex shrink-0 items-center gap-2"><span className="tabular text-ink-soft">{fmtDuration(s.duration)} · {money0(s.price)}</span>
                <button type="button" aria-label={`Remove ${s.name}`} onClick={() => setD({ ...d, serviceIds: d.serviceIds.filter((x) => x !== s.id) })} className="px-1 text-ink-mute hover:text-red-700">×</button></span>
            </li>
          ))}
        </ul>
        <Input placeholder="Find a service" value={svcQ} onChange={(e) => setSvcQ(e.target.value)} aria-label="Find a service" />
        <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-line">
          {svcList.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setD({ ...d, serviceIds: [...d.serviceIds, s.id] })} className="flex w-full items-center justify-between gap-2 border-b border-line px-3 py-1.5 text-left text-[13px] last:border-b-0 hover:bg-canvas">
                <span className="min-w-0"><span className="block truncate">{s.name}</span><span className="text-[11.5px] text-ink-mute">{s.category}</span></span>
                <span className="tabular shrink-0 text-ink-soft">{fmtDuration(s.duration)} · {money0(s.price)}</span>
              </button>
            </li>
          ))}
          {svcList.length === 0 && <li className="px-3 py-2 text-[13px] text-ink-mute">No more services match.</li>}
        </ul>
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2 text-[13px]">
            <span>{chosen.length ? `${fmtTime(d.startTime)} – ${fmtTime(fromMinutes(toMinutes(d.startTime) + duration))} · ${fmtDuration(duration)}` : 'Add services to see the end time'}</span>
            <span className="tabular font-semibold">{money0(price)}</span>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onDone()}>Cancel</Button>
            <Button type="submit" disabled={pending || !chosen.length}>{pending ? 'Booking…' : 'Book appointment'}</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
