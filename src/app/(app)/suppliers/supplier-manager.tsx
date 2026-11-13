'use client';
import { useState } from 'react';
import { gstinProps, phoneProps } from '@/lib/validate';
import Link from 'next/link';
import { Mail, MapPin, Phone, Plus } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Input, Textarea } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/client/use-action';
import { fmtDate, money0, plural } from '@/lib/format';
import { saveSupplier, setSupplierActive, type SupplierInput } from './api';

type Row = {
  id: string; name: string; contact: string | null; phone: string | null; email: string | null; address: string | null; gstin: string | null; notes: string | null;
  active: boolean; billed: number; due: number; products: number; deliveries: number; units: number; lastDelivery: string | null;
};

export function SupplierManager({ suppliers, editable }: { suppliers: Row[]; editable: boolean }) {
  const [f, setF] = useState<SupplierInput | null>(null);
  const [archiving, setArchiving] = useState<Row | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState('');
  const { run, pending } = useAction();
  const archived = suppliers.filter((s) => !s.active).length;
  const shown = suppliers.filter((s) => (showArchived || s.active) && `${s.name} ${s.contact ?? ''} ${s.phone ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const set = (k: keyof SupplierInput) => (e: { target: { value: string } }) => setF((x) => x && { ...x, [k]: e.target.value });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search suppliers" className="max-w-xs" aria-label="Search suppliers" />
        <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink-soft">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 accent-violet-600" />
          Show archived{archived > 0 && ` (${archived})`}
        </label>
        {editable && <Button className="ml-auto" onClick={() => setF({ name: '' })}><Plus size={16} />Add supplier</Button>}
      </div>

      {shown.length === 0 ? <Card><Empty title={suppliers.length ? 'No suppliers match' : 'No suppliers yet'}>Add the vendors you buy products and supplies from.</Empty></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((s) => (
            <Card key={s.id} className={s.active ? '' : 'bg-stone-50'}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[16px] font-semibold"><Link href={`/suppliers/${s.id}`} className="hover:text-violet-700">{s.name}</Link>{!s.active && <Badge>Archived</Badge>}</div>
                  {s.contact && <div className="text-ink-mute">{s.contact}</div>}
                </div>
                {s.due > 0.5 ? <Badge tone="amber">{money0(s.due)} due</Badge> : s.gstin && <Badge tone="blue">GSTIN {s.gstin}</Badge>}
              </div>
              <div className="mt-3 space-y-1 text-[13.5px] text-ink-soft">
                {s.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-ink-mute" />{s.phone}</div>}
                {s.email && <div className="flex items-center gap-2"><Mail size={14} className="text-ink-mute" />{s.email}</div>}
                {s.address && <div className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-ink-mute" />{s.address}</div>}
                {s.notes && <div className="pt-1 text-ink-mute">{s.notes}</div>}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-[12.5px] text-ink-mute">
                  {s.billed > 0 ? `${money0(s.billed)} billed · ` : ''}{plural(s.products, 'product')} · {s.deliveries ? `${plural(s.deliveries, 'delivery', 'deliveries')}, ${s.units} units, last ${fmtDate(s.lastDelivery!)}` : 'no deliveries recorded'}
                </span>
                {editable && (
                  <div className="flex gap-1">
                    <Link href={`/suppliers/${s.id}`} className="inline-flex items-center rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-violet-700 hover:bg-violet-50">Bills</Link>
                    <Button size="sm" variant="ghost" onClick={() => setF({ ...s })}>Edit</Button>
                    {s.active
                      ? <Button size="sm" variant="ghost" onClick={() => setArchiving(s)}>Archive</Button>
                      : <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setSupplierActive(s.id, true), 'Supplier restored')}>Unarchive</Button>}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Edit supplier' : 'Add supplier'}>
        {f && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => { e.preventDefault(); if ((await run(() => saveSupplier(f), 'Supplier saved')) !== false) setF(null); }}>
            <Field label="Supplier name" className="col-span-2"><Input value={f.name} onChange={set('name')} required autoFocus /></Field>
            <Field label="Contact person"><Input value={f.contact ?? ''} onChange={set('contact')} /></Field>
            <Field label="Phone"><Input {...phoneProps} value={f.phone ?? ''} onChange={set('phone')} placeholder="98765 43210" /></Field>
            <Field label="Email"><Input type="email" value={f.email ?? ''} onChange={set('email')} /></Field>
            <Field label="GSTIN"><Input {...gstinProps} value={f.gstin ?? ''} onChange={set('gstin')} className="uppercase" /></Field>
            <Field label="Address" className="col-span-2"><Input value={f.address ?? ''} onChange={set('address')} /></Field>
            <Field label="Notes" className="col-span-2"><Textarea value={f.notes ?? ''} onChange={set('notes')} placeholder="Payment terms, delivery days…" /></Field>
            <div className="col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setF(null)}>Cancel</Button><Button type="submit" disabled={pending}>Save supplier</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!archiving} onClose={() => setArchiving(null)} title="Archive this supplier?">
        <p className="text-ink-soft">{archiving?.name} will no longer be offered when adding stock. Their past deliveries and linked products stay.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setArchiving(null)}>Keep</Button>
          <Button variant="danger" disabled={pending} onClick={async () => { if ((await run(() => setSupplierActive(archiving!.id, false), 'Supplier archived')) !== false) setArchiving(null); }}>Archive</Button>
        </div>
      </Modal>
    </>
  );
}
