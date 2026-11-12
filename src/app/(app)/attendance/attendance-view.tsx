'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Input, Stat, cx, type Tone } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { addDays, dayOfWeek, DAY_NAMES, fmtTime, monthEnd } from '@/lib/format';
import { dayState, hoursWorked, type Day } from '@/lib/attendance';
import { punchIn, punchOut, saveTimes } from './actions';

type Rec = { date: string; checkIn: string; checkOut: string | null };
export type Row = { id: string; name: string; title: string; workDays: number[]; startTime: string; endTime: string; records: Rec[] };

const LABEL: Record<Day, string> = { present: 'Present', in: 'Punched in', absent: 'Absent', pending: 'Not in yet', off: 'Weekly off', future: '' };
const TONE: Record<Day, Tone> = { present: 'green', in: 'blue', absent: 'red', pending: 'gray', off: 'gray', future: 'gray' };
const CELL: Record<Day, string> = {
  present: 'bg-emerald-50 text-emerald-700', in: 'bg-sky-50 text-sky-700', absent: 'bg-rose-50 text-rose-700',
  pending: 'text-stone-300', off: 'bg-stone-100 text-stone-300', future: 'text-stone-200',
};
const LETTER: Record<Day, string> = { present: 'P', in: 'P', absent: 'A', pending: '–', off: '·', future: '' };
const hrs = (h: number) => `${Math.floor(h)}h${Math.round((h % 1) * 60) ? ` ${Math.round((h % 1) * 60)}m` : ''}`;
const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

type Props = { view: 'day' | 'month'; date: string; month: string; today: string; nowMinutes: number; rows: Row[]; editable: boolean };

export function AttendanceView(p: Props) {
  const tabs = [['day', `/attendance?date=${p.date}`, 'Daily'], ['month', `/attendance?view=month&month=${p.month}`, 'Monthly']] as const;
  return (
    <div className="min-w-0">
      <div className="mb-5 inline-flex rounded-xl border border-line bg-white p-1">
        {tabs.map(([k, href, label]) => (
          <Link key={k} href={href} className={cx('rounded-lg px-4 py-1.5 text-[14px] font-semibold', p.view === k ? 'bg-violet-600 text-white' : 'text-ink-soft hover:bg-stone-100')}>{label}</Link>
        ))}
      </div>
      {p.rows.length === 0 ? <Card pad={false}><Empty title="No staff yet">Add your team on the Staff page first.</Empty></Card>
        : p.view === 'day' ? <Daily {...p} /> : <Monthly {...p} />}
    </div>
  );
}

function Daily({ date, today, nowMinutes, rows, editable }: Props) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<{ row: Row; checkIn: string; checkOut: string } | null>(null);
  const dow = dayOfWeek(date);
  const items = rows.map((r) => {
    const c = r.records.find((x) => x.date === date);
    return { r, c, state: dayState({ date, today, nowMinutes, workDay: r.workDays.includes(dow), shiftEnd: r.endTime, checkIn: c?.checkIn, checkOut: c?.checkOut }) };
  });
  const n = (...s: Day[]) => items.filter((i) => s.includes(i.state)).length;
  const go = (d: string) => d && router.push(`/attendance?date=${d}`);
  const canPunch = date <= today;

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Present" value={n('present', 'in')} tone="good" />
        <Stat label="Still in" value={n('in')} note="Punched in, not out yet" />
        <Stat label="Absent" value={n('absent')} tone={n('absent') ? 'warn' : undefined} />
        <Stat label="Not in yet" value={n('pending')} note="Shift not over" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1">
        <Button variant="secondary" aria-label="Previous day" onClick={() => go(addDays(date, -1))}><ChevronLeft size={16} /></Button>
        <Input type="date" value={date} onChange={(e) => go(e.target.value)} className="w-auto" aria-label="Date" />
        <Button variant="secondary" aria-label="Next day" onClick={() => go(addDays(date, 1))}><ChevronRight size={16} /></Button>
        {date !== today && <Button variant="ghost" onClick={() => go(today)}>Today</Button>}
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Staff</th><th>Shift</th><th>Punch in</th><th>Punch out</th><th className="text-right">Hours</th><th>Status</th>{editable && <th />}</tr></thead>
            <tbody>
              {items.map(({ r, c, state }) => {
                const h = hoursWorked(c?.checkIn, c?.checkOut);
                return (
                  <tr key={r.id} className="hover:bg-canvas/60">
                    <td><div className="font-medium">{r.name}</div><div className="text-[12px] text-ink-mute">{r.title}</div></td>
                    <td className="whitespace-nowrap text-ink-soft">{r.workDays.includes(dow) ? `${fmtTime(r.startTime)} – ${fmtTime(r.endTime)}` : 'Weekly off'}</td>
                    <td className="tabular whitespace-nowrap">{c ? fmtTime(c.checkIn) : '—'}</td>
                    <td className="tabular whitespace-nowrap">{c?.checkOut ? fmtTime(c.checkOut) : '—'}</td>
                    <td className="tabular text-right">{h ? hrs(h) : '—'}</td>
                    <td>{LABEL[state] && <Badge tone={TONE[state]}>{LABEL[state]}</Badge>}</td>
                    {editable && (
                      <td className="whitespace-nowrap text-right">
                        {canPunch && !c && <Button size="sm" disabled={pending} onClick={() => run(() => punchIn({ staffId: r.id, date, time: nowTime() }), `${r.name} punched in`)}><LogIn size={14} />Punch in</Button>}
                        {canPunch && c && !c.checkOut && <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => punchOut({ staffId: r.id, date, time: nowTime() }), `${r.name} punched out`)}><LogOut size={14} />Punch out</Button>}
                        {canPunch && <Button size="sm" variant="ghost" onClick={() => setEdit({ row: r, checkIn: c?.checkIn ?? '', checkOut: c?.checkOut ?? '' })}>Edit times</Button>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-[12.5px] text-ink-mute">Anyone on a working day with no punch-in is marked absent{date === today ? ' once their shift is over' : ''}.</p>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `${edit.row.name} · edit times` : ''}>
        {edit && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => {
            e.preventDefault();
            if ((await run(() => saveTimes({ staffId: edit.row.id, date, checkIn: edit.checkIn, checkOut: edit.checkOut }), 'Times saved')) !== false) setEdit(null);
          }}>
            <Field label="Punch in"><Input type="time" value={edit.checkIn} onChange={(e) => setEdit({ ...edit, checkIn: e.target.value })} autoFocus /></Field>
            <Field label="Punch out"><Input type="time" value={edit.checkOut} onChange={(e) => setEdit({ ...edit, checkOut: e.target.value })} /></Field>
            <p className="col-span-2 text-[12.5px] text-ink-mute">Clear both times and save to remove the day. That person will show as absent.</p>
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button type="submit" disabled={pending}>Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Monthly({ month, today, nowMinutes, rows }: Props) {
  const router = useRouter();
  const from = `${month}-01`;
  const days = Array.from({ length: Number(monthEnd(from).slice(8)) }, (_, i) => addDays(from, i));
  const stats = rows.map((r) => {
    const by = new Map(r.records.map((x) => [x.date, x]));
    const cells = days.map((d) => {
      const c = by.get(d);
      return { d, c, state: dayState({ date: d, today, nowMinutes, workDay: r.workDays.includes(dayOfWeek(d)), shiftEnd: r.endTime, checkIn: c?.checkIn, checkOut: c?.checkOut }) };
    });
    return {
      r, cells,
      present: cells.filter((x) => x.state === 'present' || x.state === 'in').length,
      absent: cells.filter((x) => x.state === 'absent').length,
      hours: r.records.reduce((a, x) => a + (hoursWorked(x.checkIn, x.checkOut) ?? 0), 0),
    };
  });
  const th = 'px-3 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-soft';

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="month" value={month} onChange={(e) => e.target.value && router.push(`/attendance?view=month&month=${e.target.value}`)} className="w-auto" aria-label="Month" />
        <div className="ml-auto flex flex-wrap gap-3 text-[12.5px] text-ink-soft">
          {(['present', 'absent', 'off'] as const).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className={cx('inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold', CELL[s])}>{LETTER[s]}</span>{s === 'present' ? 'Punched in' : s === 'absent' ? 'Absent' : 'Weekly off'}</span>)}
        </div>
      </div>
      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 z-10 min-w-[150px] bg-white px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-soft">Staff</th>
                {days.map((d) => (
                  <th key={d} className="px-0.5 py-2 text-center font-semibold text-ink-soft">
                    <div className="tabular">{Number(d.slice(8))}</div><div className="text-[10px] font-medium text-ink-mute">{DAY_NAMES[dayOfWeek(d)][0]}</div>
                  </th>
                ))}
                <th className={th}>Present</th><th className={th}>Absent</th><th className={th}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(({ r, cells, present, absent, hours }) => (
                <tr key={r.id} className="border-b border-line last:border-b-0">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3"><div className="font-medium">{r.name}</div><div className="text-[11.5px] text-ink-mute">{r.title}</div></td>
                  {cells.map(({ d, c, state }) => (
                    <td key={d} className="px-0.5 py-2 text-center" title={c ? `${d}: ${fmtTime(c.checkIn)} – ${c.checkOut ? fmtTime(c.checkOut) : 'no punch out'}` : state === 'absent' ? `${d}: absent` : undefined}>
                      <span className={cx('inline-flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold', CELL[state])}>{LETTER[state]}</span>
                    </td>
                  ))}
                  <td className="tabular px-3 py-3 text-right font-semibold">{present}</td>
                  <td className={cx('tabular px-3 py-3 text-right font-semibold', absent > 0 && 'text-rose-600')}>{absent}</td>
                  <td className="tabular px-3 py-3 text-right text-ink-soft">{hours ? hrs(hours) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-[12.5px] text-ink-mute">Hover a day to see the punch times. Hours add up only the days with both punch in and punch out.</p>
    </>
  );
}
