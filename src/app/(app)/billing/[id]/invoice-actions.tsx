'use client';
import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Field, Input, Select } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { money, round2 } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/validate';
import { addPayment, voidInvoice } from '../actions';

export function InvoiceActions({ id, due, isVoid, canVoid }: { id: string; due: number; isVoid: boolean; canVoid: boolean }) {
  const [pay, setPay] = useState<{ amount: string; method: (typeof PAYMENT_METHODS)[number]; reference: string } | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const { run, pending } = useAction();

  return (
    <div className="flex flex-wrap gap-2">
      {due > 0.005 && <Button onClick={() => setPay({ amount: String(round2(due)), method: 'UPI', reference: '' })}>Take payment</Button>}
      <Button variant="secondary" onClick={() => window.print()}><Printer size={15} />Print or save PDF</Button>
      {canVoid && !isVoid && <Button variant="danger" onClick={() => setReason('')}>Void bill</Button>}

      <Modal open={!!pay} onClose={() => setPay(null)} title={`Take payment · ${money(due)} due`}>
        {pay && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => {
            e.preventDefault();
            if ((await run(() => addPayment(id, { ...pay, amount: Number(pay.amount) }), 'Payment recorded')) !== false) setPay(null);
          }}>
            <Field label="Amount (₹)"><Input type="number" min="0.01" step="0.01" max={round2(due)} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} required autoFocus /></Field>
            <Field label="Method"><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as typeof pay.method })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
            <Field label="Reference" className="col-span-2"><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} placeholder="UPI or card reference (optional)" /></Field>
            <div className="col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setPay(null)}>Cancel</Button><Button type="submit" disabled={pending}>Record payment</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={reason !== null} onClose={() => setReason(null)} title="Void this bill?">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if ((await run(() => voidInvoice(id, reason ?? ''), 'Bill voided')) !== false) setReason(null);
        }}>
          <p className="text-ink-soft">The bill stays on record marked Void and is left out of sales reports. Products on it go back into stock, and a linked appointment can be billed again. Refund any money paid separately.</p>
          <Field label="Reason"><Input value={reason ?? ''} onChange={(e) => setReason(e.target.value)} required placeholder="Billed to the wrong client" autoFocus /></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setReason(null)}>Keep bill</Button><Button type="submit" variant="danger" disabled={pending}>Void bill</Button></div>
        </form>
      </Modal>
    </div>
  );
}
