'use client';
import { useState } from 'react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { toast } from '@/components/toast';
import { useAction } from '@/client/use-action';
import { saveCustomer, type CustomerInput } from './api';
import { phoneProps } from '@/lib/validate';

export type StaffOption = { id: string; name: string };
export type BranchOption = { id: string; name: string };

export function CustomerForm({ initial, staff, branches = [], onDone }:
  { initial?: CustomerInput; staff: StaffOption[]; branches?: BranchOption[]; onDone: (c?: { id: string; name: string; phone: string }) => void }) {
  const [f, setF] = useState<CustomerInput>(initial ?? { name: '', phone: '' });
  const { run, pending } = useAction();
  const set = (k: keyof CustomerInput) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (branches.length > 0 && !f.branchId) { toast.error('Choose the branch.'); return; }
        const r = await run(() => saveCustomer(f), f.id ? 'Client updated' : 'Client added');
        if (r !== false) onDone(r);
      }}
    >
      <Field label="Full name"><Input id="c-name" value={f.name} onChange={set('name')} required /></Field>
      <Field label="Mobile number"><Input {...phoneProps} id="c-phone" value={f.phone} onChange={set('phone')} required placeholder="+91 98765 43210" /></Field>
      <Field label="Email (optional)"><Input id="c-email" type="email" value={f.email ?? ''} onChange={set('email')} /></Field>
      <Field label="Gender">
        <Select id="c-gender" value={f.gender ?? ''} onChange={set('gender')}>
          <option value="" disabled>Select gender</option><option>Female</option><option>Male</option><option>Other</option>
        </Select>
      </Field>
      {branches.length > 0 && (
        <Field label="Branch">
          <Select id="c-branch" value={f.branchId ?? ''} onChange={set('branchId')}>
            <option value="" disabled>Select branch</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Preferred stylist (optional)">
        <Select id="c-pref" value={f.preferredStaffId ?? ''} onChange={set('preferredStaffId')}>
          <option value="">No preference</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Notes (optional)" className="sm:col-span-2">
        <Textarea id="c-notes" value={f.notes ?? ''} onChange={set('notes')} placeholder="Hair or nail details, allergies, preferences, VIP details" />
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={() => onDone()}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : f.id ? 'Save changes' : 'Add client'}</Button>
      </div>
    </form>
  );
}
