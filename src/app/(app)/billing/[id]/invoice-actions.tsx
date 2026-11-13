'use client';
import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { toast } from '@/components/toast';
import { Button, Field, Input, Select } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { money, round2 } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/validate';
import { addPayment, cancelInvoice, refundInvoice } from '../api';

/**
 * Renders the A4 sheet to a PDF named after the bill. The browser itself draws the sheet
 * (via an SVG snapshot), so the PDF matches the screen exactly. Long bills continue on more pages.
 */
async function downloadPdf(number: string) {
  const sheet = document.getElementById('invoice-sheet');
  if (!sheet) return;
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  await document.fonts.ready;
  const opts = { pixelRatio: 2.5, backgroundColor: '#ffffff', quality: 0.95, style: { boxShadow: 'none', margin: '0' } };
  await toJpeg(sheet, opts); // first pass loads fonts and images into the snapshot
  const img = await toJpeg(sheet, opts);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210, pageH = 297;
  const imgH = (sheet.offsetHeight * pageW) / sheet.offsetWidth;
  for (let y = 0, page = 0; y < imgH - 0.5; y += pageH, page++) {
    if (page) pdf.addPage();
    pdf.addImage(img, 'JPEG', 0, -y, pageW, imgH);
  }
  pdf.save(`${number}.pdf`);
}

export function InvoiceActions({ id, number, due, isCancelled, canManage, refundable }: { id: string; number: string; due: number; isCancelled: boolean; canManage: boolean; refundable: number }) {
  const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState<{ amount: string; method: (typeof PAYMENT_METHODS)[number]; reference: string } | null>(null);
  const [cancel, setCancel] = useState<{ reason: string; refund: boolean; method: (typeof PAYMENT_METHODS)[number] } | null>(null);
  const [refund, setRefund] = useState<{ amount: string; method: (typeof PAYMENT_METHODS)[number]; reason: string } | null>(null);
  const { run, pending } = useAction();

  return (
    <div className="flex flex-wrap gap-2">
      {due > 0.005 && <Button onClick={() => setPay({ amount: String(round2(due)), method: 'UPI', reference: '' })}>Take payment</Button>}
      <Button variant="secondary" onClick={() => window.print()}><Printer size={16} />Print</Button>
      <Button variant="secondary" disabled={busy} onClick={async () => {
        setBusy(true);
        try { await downloadPdf(number); } catch { toast.error('Could not create the PDF. Try Print and choose Save as PDF instead.'); }
        setBusy(false);
      }}><Download size={16} />{busy ? 'Preparing PDF…' : 'Download PDF'}</Button>
      {canManage && !isCancelled && refundable > 0.005 && <Button variant="secondary" onClick={() => setRefund({ amount: String(round2(refundable)), method: 'Cash', reason: '' })}>Refund</Button>}
      {canManage && !isCancelled && <Button variant="danger" onClick={() => setCancel({ reason: '', refund: refundable > 0.005, method: 'Cash' })}>Cancel bill</Button>}

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

      <Modal open={!!refund} onClose={() => setRefund(null)} title={`Refund · up to ${money(refundable)}`}>
        {refund && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => {
            e.preventDefault();
            if ((await run(() => refundInvoice(id, { ...refund, amount: Number(refund.amount) }), 'Refund recorded')) !== false) setRefund(null);
          }}>
            <Field label="Refund amount (₹)"><Input type="number" min="0.01" step="0.01" max={round2(refundable)} value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} required autoFocus /></Field>
            <Field label="Returned via"><Select value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value as typeof refund.method })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
            <Field label="Reason" className="col-span-2"><Input value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} required placeholder="Unhappy with the service, wrong charge…" /></Field>
            <p className="col-span-2 text-[12.5px] text-ink-mute">This gives money back and lowers the amount collected. The bill itself stays as it is. To take the whole sale off the books, use Cancel bill instead.</p>
            <div className="col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setRefund(null)}>Close</Button><Button type="submit" disabled={pending}>Record refund</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!cancel} onClose={() => setCancel(null)} title="Cancel this bill?">
        {cancel && (
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            if ((await run(() => cancelInvoice(id, cancel.reason, cancel.refund ? cancel.method : null), cancel.refund ? 'Bill cancelled and refunded' : 'Bill cancelled')) !== false) setCancel(null);
          }}>
            <p className="text-ink-soft">The bill stays on record marked Cancelled and is left out of sales reports. Products on it go back into stock, and a linked appointment can be billed again.</p>
            <Field label="Reason"><Input value={cancel.reason} onChange={(e) => setCancel({ ...cancel, reason: e.target.value })} required placeholder="Billed to the wrong client" autoFocus /></Field>
            {refundable > 0.005 && (
              <div className="rounded-lg border border-line p-3">
                <label className="flex items-center gap-2 text-[14px] font-medium"><input type="checkbox" checked={cancel.refund} onChange={(e) => setCancel({ ...cancel, refund: e.target.checked })} className="h-4 w-4 accent-violet-600" />Refund the {money(refundable)} paid</label>
                {cancel.refund && <div className="mt-3"><Field label="Returned via"><Select value={cancel.method} onChange={(e) => setCancel({ ...cancel, method: e.target.value as typeof cancel.method })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field></div>}
              </div>
            )}
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setCancel(null)}>Keep bill</Button><Button type="submit" variant="danger" disabled={pending}>Cancel bill</Button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
