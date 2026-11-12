'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Input, Stat, cx, type Tone } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { addDays, dayOfWeek, DAY_NAMES, fmtTime, monthEnd, plural } from '@/lib/format';
import { STATUSES, STATUS_LABEL, STATUS_LETTER, STATUS_WEIGHT, hoursWorked, type AttendanceStatus } from '@/lib/attendance';
import { clearAttendance, markAllPresent, saveAttendance } from './actions';

type Rec = { date: string; status: AttendanceStatus; checkIn: string | null; checkOut: string | null; note: string | null };
export type Row = { id: string; name: string; title: string; workDays: number[]; startTime: string; endTime: string; records: Rec[] };

const TONE: Record<AttendanceStatus, Tone> = { Present: 'green', HalfDay: 'amber', Leave: 'blue', Absent: 'red' };
const CELL: Record<AttendanceStatus, string> = {
  Present: 'bg-emerald-50 text-emerald-700', HalfDay: 'bg-amber-50 text-amber-700', Leave: 'bg-sky-50 text-sky-700', Absent: 'bg-rose-50 text-rose-700',
};
const hrs = (h: number) => `${Math.floor(h)}h${Math.round((h % 1) * 60) ? ` ${Math.round((h % 1) * 60)}m` : ''}`;

export function AttendanceView({ view, date, month, today, rows, editable }: { view: 'day' | 'month'; date: string; month: string; today: string; rows: Row[]; editable: boolean }) {
  const tabs = [['day', `/attendance?date=${date}`, 'Daily'], ['month', `/attendance?view=month&month=${month}`, 'Monthly']] as const;
  return (
    <div className="min-w-0">
      <div className="mb-5 inline-flex rounded-xl border border-line bg-white p-1">
        {tabs.map(([k, href, label]) => (
          <Link key={k} href={href} className={cx('rounded-lg px-4 py-1.5 text-[14px] font-semibold', view === k ? 'bg-violet-600 text-white' : 'text-ink-soft hover:bg-stone-100')}>{label}</Link>
        ))}
      </div>
      {rows.length === 0 ? <Card pad={false}><Empty title="No staff yet">Add your team on the Staff page first.</Empty></Card>
        : view === 'day' ? <Daily date={date} today={today} rows={rows} editable={editable} /> : <Monthly month={month} rows={rows} />}
    </div>
  );
}

function Daily({ date, today, rows, editable }: { date: string; today: string; rows: Row[]; editable: boolean }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<{ row: Row; status: AttendanceStatus; checkIn: string; checkOut: string; note: string } | null>(null);
  const dow = dayOfWeek(date);
  const rec = (r: Row) => r.records.find((x) => x.date === date);
  const count = (s: AttendanceStatus) => rows.filter((r) => rec(r)?.status === s).length;
  const unmarked = rows.filter((r) => !rec(r));
  const scheduledUnmarked = unmarked.filter((r) => r.workDays.includes(dow)).length;
  const go = (d: string) => d && router.push(`/attendance?date=${d}`);

  const mark = (r: Row, status: AttendanceStatus) => {
    const cur = rec(r);
    if (cur?.status === status) return run(() => clearAttendance(r.id, date));
    return run(() => saveAttendance({
      staffId: r.id, date, status,
      checkIn: cur?.checkIn ?? (status === 'Present' || status === 'HalfDay' ? r.startTime : ''), checkOut: cur?.checkOut ?? '', note: cur?.note ?? '',
    }));
  };

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Present" value={count('Present')} tone="good" />
        <Stat label="Half day" value={count('HalfDay')} />
        <Stat label="On leave" value={count('Leave')} />
        <Stat label="Absent" value={count('Absent')} tone={count('Absent') ? 'warn' : undefined} />
        <Stat label="Not marked" value={unmarked.length} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="secondary" aria-label="Previous day" onClick={() => go(addDays(date, -1))}><ChevronLeft size={16} /></Button>
          <Input type="date" value={date} onChange={(e) => go(e.target.value)} className="w-auto" aria-label="Date" />
          <Button variant="secondary" aria-label="Next day" onClick={() => go(addDays(date, 1))}><ChevronRight size={16} /></Button>
          {date !== today && <Button variant="ghost" onClick={() => go(today)}>Today</Button>}
        </div>
        {editable && (
          <Button className="ml-auto" disabled={pending || scheduledUnmarked === 0}
            onClick={() => run(() => markAllPresent(date), 'Marked present')}>
            <CheckCheck size={16} />Mark all present{scheduledUnmarked > 0 && ` (${scheduledUnmarked})`}
          </Button>
        )}
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Staff</th><th>Shift</th><th>Status</th><th>In / Out</th><th className="text-right">Hours</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => {
                const c = rec(r);
                const offDay = !r.workDays.includes(dow);
                const h = hoursWorked(c?.checkIn, c?.checkOut);
                return (
                  <tr key={r.id} className="hover:bg-canvas/60">
                    <td><div className="font-medium">{r.name}</div><div className="text-[12px] text-ink-mute">{r.title}</div></td>
                    <td className="whitespace-nowrap text-ink-soft">
                      {offDay ? <Badge>Weekly off</Badge> : `${fmtTime(r.startTime)} – ${fmtTime(r.endTime)}`}
                    </td>
                    <td>
                      {editable ? (
                        <div className="flex flex-wrap gap-1.5">
                          {STATUSES.map((s) => (
                            <button key={s} type="button" disabled={pending} onClick={() => mark(r, s)} aria-pressed={c?.status === s}
                              className={cx('rounded-lg border px-2.5 py-1 text-[12.5px] font-semibold transition-colors disabled:opacity-50',
                                c?.status === s ? `${CELL[s]} border-current` : 'border-line bg-white text-ink-soft hover:bg-stone-100')}>
                              {STATUS_LABEL[s]}
                            </button>
                          ))}
                        </div>
                      ) : c ? <Badge tone={TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge> : <span className="text-ink-mute">Not marked</span>}
                    </td>
                    <td className="tabular whitespace-nowrap text-ink-soft">
                      {c?.checkIn || c?.checkOut ? `${c.checkIn ? fmtTime(c.checkIn) : '—'} / ${c.checkOut ? fmtTime(c.checkOut) : '—'}` : '—'}
                      {c?.note && <div className="max-w-[220px] truncate text-[12px] text-ink-mute" title={c.note}>{c.note}</div>}
                    </td>
                    <td className="tabular text-right">{h ? hrs(h) : '—'}</td>
                    <td className="text-right">
                      {editable && c && (
                        <Button size="sm" variant="ghost" onClick={() => setEdit({ row: r, status: c.status, checkIn: c.checkIn ?? '', checkOut: c.checkOut ?? '', note: c.note ?? '' })}>Times & note</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `${edit.row.name} · ${STATUS_LABEL[edit.status]}` : ''}>
        {edit && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => {
            e.preventDefault();
            const { row, ...f } = edit;
            if ((await run(() => saveAttendance({ staffId: row.id, date, ...f }), 'Attendance saved')) !== false) setEdit(null);
          }}>
            <Field label="Check-in"><Input type="time" value={edit.checkIn} onChange={(e) => setEdit({ ...edit, checkIn: e.target.value })} disabled={edit.status === 'Leave' || edit.status === 'Absent'} /></Field>
            <Field label="Check-out"><Input type="time" value={edit.checkOut} onChange={(e) => setEdit({ ...edit, checkOut: e.target.value })} disabled={edit.status === 'Leave' || edit.status === 'Absent'} /></Field>
            <Field label="Note" className="col-span-2"><Input value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} maxLength={200} placeholder="Came late, left early, reason for leave…" /></Field>
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

function Monthly({ month, rows }: { month: string; rows: Row[] }) {
  const router = useRouter();
  const from = `${month}-01`;
  const days = Array.from({ length: Number(monthEnd(from).slice(8)) }, (_, i) => addDays(from, i));
  const stats = rows.map((r) => {
    const by = new Map(r.records.map((x) => [x.date, x]));
    const n = (s: AttendanceStatus) => r.records.filter((x) => x.status === s).length;
    const worked = r.records.reduce((a, x) => a + STATUS_WEIGHT[x.status], 0);
    const hours = r.records.reduce((a, x) => a + (hoursWorked(x.checkIn, x.checkOut) ?? 0), 0);
    return { r, by, worked, hours, present: n('Present'), half: n('HalfDay'), leave: n('Leave'), absent: n('Absent') };
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="month" value={month} onChange={(e) => e.target.value && router.push(`/attendance?view=month&month=${e.target.value}`)} className="w-auto" aria-label="Month" />
        <div className="ml-auto flex flex-wrap gap-3 text-[12.5px] text-ink-soft">
          {STATUSES.map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className={cx('inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold', CELL[s])}>{STATUS_LETTER[s]}</span>{STATUS_LABEL[s]}</span>)}
          <span className="inline-flex items-center gap-1.5"><span className="inline-flex h-5 w-5 items-center justify-center rounded bg-stone-100 text-[11px] text-stone-400">off</span>Weekly off</span>
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
                <th className="px-3 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-soft">Days</th>
                <th className="px-3 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-soft">Hours</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(({ r, by, worked, hours, present, half, leave, absent }) => (
                <tr key={r.id} className="border-b border-line last:border-b-0">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-[11.5px] text-ink-mute">{[plural(present, 'present', 'present'), half && `${half} half`, leave && `${leave} leave`, absent && `${absent} absent`].filter(Boolean).join(' · ')}</div>
                  </td>
                  {days.map((d) => {
                    const c = by.get(d);
                    const off = !r.workDays.includes(dayOfWeek(d));
                    return (
                      <td key={d} className="px-0.5 py-2 text-center" title={c ? `${d}: ${STATUS_LABEL[c.status]}${c.note ? ` — ${c.note}` : ''}` : undefined}>
                        <span className={cx('inline-flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold', c ? CELL[c.status] : off ? 'bg-stone-100 text-stone-300' : 'text-stone-300')}>
                          {c ? STATUS_LETTER[c.status] : off ? '·' : '–'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="tabular px-3 py-3 text-right font-semibold">{worked}</td>
                  <td className="tabular px-3 py-3 text-right text-ink-soft">{hours ? hrs(hours) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-[12.5px] text-ink-mute">Days counts a present day as 1 and a half day as 0.5. Hours add up only the days with both check-in and check-out.</p>
    </>
  );
}
