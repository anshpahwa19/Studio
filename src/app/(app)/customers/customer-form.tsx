'use client';
import { useState } from 'react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { useAction } from '@/components/use-action';
import { saveCustomer, type CustomerInput } from './actions';
import { phoneProps } from '@/lib/validate';

export type StaffOption = { id: string; name: string };

export function CustomerForm({ initial, staff, onDone }:
  { initial?: CustomerInput; staff: StaffOption[]; onDone: (c?: { id: string; name: string; phone: string }) => void }) {
  const [f, setF] = useState<CustomerInput>(initial ?? { name: '', phone: '' });
  const { run, pending } = useAction();
  const set = (k: keyof CustomerInput) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await run(() => saveCustomer(f), f.id ? 'Client updated' : 'Client added');
        if (r !== false) onDone(r);
      }}
    >
      <Field label="Full name"><Input id="c-name" value={f.name} onChange={set('name')} required /></Field>
      <Field label="Mobile number"><Input {...phoneProps} id="c-phone" value={f.phone} onChange={set('phone')} required placeholder="+91 98765 43210" /></Field>
      <Field label="Email"><Input id="c-email" type="email" value={f.email ?? ''} onChange={set('email')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gender">
          <Select id="c-gender" value={f.gender ?? ''} onChange={set('gender')}>
            <option value="">Not set</option><option>Female</option><option>Male</option><option>Other</option>
          </Select>
        </Field>
        <Field label="Birthday"><Input id="c-bday" type="date" value={f.birthday ?? ''} onChange={set('birthday')} /></Field>
      </div>
      <Field label="Preferred stylist">
        <Select id="c-pref" value={f.preferredStaffId ?? ''} onChange={set('preferredStaffId')}>
          <option value="">No preference</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Address"><Input id="c-address" value={f.address ?? ''} onChange={set('address')} /></Field>
      <Field label="Hair notes" className="sm:col-span-2">
        <Textarea id="c-hair" value={f.hairNotes ?? ''} onChange={set('hairNotes')} placeholder="Cut style, colour formula, scalp sensitivity, treatment frequency" />
      </Field>
      <Field label="Nail notes" className="sm:col-span-2">
        <Textarea id="c-nail" value={f.nailNotes ?? ''} onChange={set('nailNotes')} placeholder="Shape, length, favourite shades, extension type" />
      </Field>
      <Field label="Other notes" className="sm:col-span-2">
        <Textarea id="c-notes" value={f.notes ?? ''} onChange={set('notes')} placeholder="Allergies, preferences, VIP details" />
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={() => onDone()}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : f.id ? 'Save changes' : 'Add client'}</Button>
      </div>
    </form>
  );
}
