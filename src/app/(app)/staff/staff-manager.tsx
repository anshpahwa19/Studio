'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Input } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { DAY_NAMES, fmtTime, plural } from '@/lib/format';
import { archiveStaff, saveStaff, type StaffInput } from './actions';

type Member = { id: string; name: string; phone: string; email: string | null; title: string; skills: string; commissionRate: number; workDays: string; startTime: string; endTime: string; upcoming: number };

const blank: StaffInput = { name: '', phone: '', email: '', title: 'Stylist', skills: '', commissionRate: 25, workDays: [1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '20:00' };

export function StaffManager({ staff }: { staff: Member[] }) {
  const [f, setF] = useState<StaffInput | null>(null);
  const [archiving, setArchiving] = useState<Member | null>(null);
  const { run, pending } = useAction();

  return (
    <>
      <div className="mb-5 flex justify-end"><Button onClick={() => setF(blank)}><Plus size={16} />Add team member</Button></div>
      {staff.length === 0 ? <Card><Empty title="No team members yet">Add stylists and nail technicians so you can book them.</Empty></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {staff.map((s) => {
            const days = s.workDays.split(',').map(Number);
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold">{s.name}</div>
                    <div className="text-ink-mute">{s.title} · {s.phone}</div>
                  </div>
                  <Badge tone="plum">{s.commissionRate}% commission</Badge>
                </div>
                {s.skills && <div className="mt-3 flex flex-wrap gap-1.5">{s.skills.split(',').map((k) => k.trim()).filter(Boolean).map((k) => <Badge key={k}>{k}</Badge>)}</div>}
                <div className="mt-4 flex flex-wrap items-center gap-1">
                  {DAY_NAMES.map((d, i) => (
                    <span key={d} className={`rounded px-1.5 py-0.5 text-[11.5px] ${days.includes(i) ? 'bg-plum-50 font-medium text-plum-700' : 'text-ink-mute line-through'}`}>{d}</span>
                  ))}
                  <span className="ml-2 text-[12.5px] text-ink-soft">{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-[12.5px] text-ink-mute">{plural(s.upcoming, 'upcoming booking')}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setF({ ...s, workDays: days })}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiving(s)}>Archive</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Edit team member' : 'Add team member'}>
        {f && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => { e.preventDefault(); if ((await run(() => saveStaff(f), 'Team member saved')) !== false) setF(null); }}>
            <Field label="Full name" className="col-span-2"><Input id="st-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field label="Mobile number"><Input id="st-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required /></Field>
            <Field label="Email"><Input id="st-email" type="email" value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Job title"><Input id="st-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required placeholder="Senior Stylist" /></Field>
            <Field label="Commission (%)"><Input id="st-comm" type="number" min="0" max="100" step="0.5" value={f.commissionRate} onChange={(e) => setF({ ...f, commissionRate: e.target.value as unknown as number })} /></Field>
            <Field label="Skills" hint="Separate with commas" className="col-span-2"><Input id="st-skills" value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="Balayage, Keratin, Nail art" /></Field>
            <fieldset className="col-span-2">
              <legend className="label">Working days</legend>
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((d, i) => {
                  const on = f.workDays.includes(i);
                  return (
                    <button key={d} type="button" aria-pressed={on}
                      onClick={() => setF({ ...f, workDays: on ? f.workDays.filter((x) => x !== i) : [...f.workDays, i] })}
                      className={`rounded-md border px-2.5 py-1 text-[12.5px] ${on ? 'border-plum-500 bg-plum-50 text-plum-700' : 'border-line text-ink-mute'}`}>{d}</button>
                  );
                })}
              </div>
            </fieldset>
            <Field label="Shift starts"><Input id="st-start" type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></Field>
            <Field label="Shift ends"><Input id="st-end" type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} /></Field>
            <div className="col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setF(null)}>Cancel</Button><Button type="submit" disabled={pending}>Save</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!archiving} onClose={() => setArchiving(null)} title="Archive this team member?">
        <p className="text-ink-soft">{archiving?.name} will no longer be bookable. Their past work stays in reports.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setArchiving(null)}>Keep</Button>
          <Button variant="danger" disabled={pending} onClick={async () => { if ((await run(() => archiveStaff(archiving!.id), 'Team member archived')) !== false) setArchiving(null); }}>Archive</Button>
        </div>
      </Modal>
    </>
  );
}
