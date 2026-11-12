'use client';
import { useState } from 'react';
import { Badge, Button, Card, Field, Input, Select } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { ROLES } from '@/lib/roles';
import { GST_RATES, gstinProps, phoneProps } from '@/lib/validate';
import { deleteBranch, deleteUser, saveBranch, saveSettings, saveUser, type SettingsInput } from './actions';

type Branch = { id: string; name: string; address: string; active: boolean };
type User = { id: string; name: string; email: string; role: string; active: boolean };
type UserDraft = { id?: string; name: string; email: string; role: (typeof ROLES)[number]; active: boolean; password: string };

const ROLE_HELP: Record<string, string> = {
  Owner: 'Everything, including settings and logins',
  Manager: 'Everything except settings',
  Receptionist: 'Appointments, billing, clients, inventory',
  Stylist: 'Appointments and client notes only',
};

export function SettingsForms({ settings, branches, users, meId }: { settings: SettingsInput & { id: number }; branches: Branch[]; users: User[]; meId: string }) {
  const [s, setS] = useState<SettingsInput>(settings);
  const [branch, setBranch] = useState<Partial<Branch> | null>(null);
  const [user, setUser] = useState<UserDraft | null>(null);
  const [removing, setRemoving] = useState<{ kind: 'branch' | 'login'; id: string; name: string } | null>(null);
  const { run, pending } = useAction();
  const set = (k: keyof SettingsInput) => (e: { target: { value: string } }) => setS({ ...s, [k]: e.target.value });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card title="Business details">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); await run(() => saveSettings(s), 'Settings saved'); }}>
          <Field label="Business name" className="sm:col-span-2"><Input value={s.name} onChange={set('name')} required /></Field>
          <Field label="Address" className="sm:col-span-2" hint="Printed on bills when no branch is chosen"><Input value={s.address} onChange={set('address')} /></Field>
          <Field label="Phone"><Input {...phoneProps} value={s.phone} onChange={set('phone')} /></Field>
          <Field label="Email"><Input value={s.email} onChange={set('email')} /></Field>
          <Field label="GSTIN" hint="Leave blank if not registered"><Input {...gstinProps} value={s.gstin} onChange={set('gstin')} className="uppercase" /></Field>
          <Field label="GST rate on bills" hint="Used on every bill that charges GST. A bill can also be made without GST."><Select aria-label="GST rate on bills" value={s.gstRate} onChange={(e) => setS({ ...s, gstRate: Number(e.target.value) })}>{GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}</Select></Field>
          <Field label="Opens at"><Input type="time" value={s.openTime} onChange={set('openTime')} /></Field>
          <Field label="Closes at"><Input type="time" value={s.closeTime} onChange={set('closeTime')} /></Field>
          <Field label="Bill number prefix"><Input value={s.invoicePrefix} onChange={set('invoicePrefix')} /></Field>
          <Field label="Next bill number" hint={`Next bill will be ${s.invoicePrefix}${s.nextInvoiceNo}`}><Input type="number" min={1} value={s.nextInvoiceNo} onChange={set('nextInvoiceNo')} /></Field>
          <Field label="Message at the bottom of bills" className="sm:col-span-2"><Input value={s.invoiceFooter} onChange={set('invoiceFooter')} /></Field>
          <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={pending}>Save details</Button></div>
        </form>
      </Card>

      <div className="min-w-0 space-y-6">
        <Card title="Branches" pad={false} actions={<Button size="sm" variant="secondary" onClick={() => setBranch({ name: '', address: '', active: true })}>Add branch</Button>}>
          <ul className="divide-y divide-line">
            {branches.length === 0 && <li className="px-5 py-4 text-ink-mute">No branches. Bills will use the business address.</li>}
            {branches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0"><div className="font-medium">{b.name} {!b.active && <Badge>Closed</Badge>}</div><div className="truncate text-[12.5px] text-ink-mute">{b.address}</div></div>
                <Button size="sm" variant="ghost" onClick={() => setBranch(b)}>Edit</Button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Logins" pad={false} actions={<Button size="sm" variant="secondary" onClick={() => setUser({ name: '', email: '', role: 'Receptionist', active: true, password: '' })}>Add login</Button>}>
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="font-medium">{u.name} {u.id === meId && <span className="text-[12px] text-ink-mute">(you)</span>} {!u.active && <Badge tone="gray">Off</Badge>}</div>
                  <div className="truncate text-[12.5px] text-ink-mute">{u.email} · {u.role}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setUser({ ...u, role: u.role as UserDraft['role'], password: '' })}>Edit</Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal open={!!branch} onClose={() => setBranch(null)} title={branch?.id ? 'Edit branch' : 'Add branch'}>
        {branch && (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if ((await run(() => saveBranch({ name: branch.name ?? '', address: branch.address ?? '', id: branch.id, active: branch.active ?? true }), 'Branch saved')) !== false) setBranch(null); }}>
            <Field label="Branch name"><Input value={branch.name ?? ''} onChange={(e) => setBranch({ ...branch, name: e.target.value })} required /></Field>
            <Field label="Address"><Input value={branch.address ?? ''} onChange={(e) => setBranch({ ...branch, address: e.target.value })} /></Field>
            {branch.id && <label className="flex items-center gap-2"><input type="checkbox" checked={branch.active ?? true} onChange={(e) => setBranch({ ...branch, active: e.target.checked })} className="h-4 w-4 accent-plum-600" />Open (shown when booking and billing)</label>}
            <div className="flex justify-between gap-2">
              {branch.id ? <Button variant="danger" onClick={() => { setRemoving({ kind: 'branch', id: branch.id!, name: branch.name ?? '' }); setBranch(null); }}>Delete</Button> : <span />}
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setBranch(null)}>Cancel</Button><Button type="submit" disabled={pending}>Save branch</Button></div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!user} onClose={() => setUser(null)} title={user?.id ? 'Edit login' : 'Add login'}>
        {user && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => { e.preventDefault(); if ((await run(() => saveUser(user), 'Login saved')) !== false) setUser(null); }}>
            <Field label="Name"><Input value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} required /></Field>
            <Field label="Email"><Input type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} required /></Field>
            <Field label="Role" hint={ROLE_HELP[user.role]} className="col-span-2">
              <Select value={user.role} onChange={(e) => setUser({ ...user, role: e.target.value as UserDraft['role'] })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Select>
            </Field>
            <Field label={user.id ? 'New password' : 'Password'} hint={user.id ? 'Leave blank to keep the current password' : 'At least 8 characters'} className="col-span-2">
              <Input type="password" autoComplete="new-password" value={user.password} onChange={(e) => setUser({ ...user, password: e.target.value })} required={!user.id} />
            </Field>
            {user.id && <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={user.active} onChange={(e) => setUser({ ...user, active: e.target.checked })} className="h-4 w-4 accent-plum-600" />Can sign in</label>}
            <div className="col-span-2 flex justify-between gap-2">
              {user.id && user.id !== meId ? <Button variant="danger" onClick={() => { setRemoving({ kind: 'login', id: user.id!, name: user.name }); setUser(null); }}>Delete</Button> : <span />}
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setUser(null)}>Cancel</Button><Button type="submit" disabled={pending}>Save login</Button></div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} title={removing?.kind === 'branch' ? 'Delete this branch?' : 'Delete this login?'}>
        <p className="text-ink-soft">
          {removing?.kind === 'branch'
            ? <>{removing.name} will be removed. This only works for a branch with no appointments, bills or expenses; otherwise mark it as not Open instead.</>
            : <>{removing?.name} will no longer be able to sign in, and the login is removed for good. To keep it but block access, untick "Can sign in" instead.</>}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRemoving(null)}>Keep</Button>
          <Button variant="danger" disabled={pending} onClick={async () => {
            const r = removing!;
            if ((await run(() => (r.kind === 'branch' ? deleteBranch(r.id) : deleteUser(r.id)), r.kind === 'branch' ? 'Branch deleted' : 'Login deleted')) !== false) setRemoving(null);
          }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
