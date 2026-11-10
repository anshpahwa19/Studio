'use client';
import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { toast } from '@/components/toast';
import { Button, Field, Input, Select } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { money, round2 } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/validate';
import { addPayment, voidInvoice } from '../actions';

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

export function InvoiceActions({ id, number, due, isVoid, canVoid }: { id: string; number: string; due: number; isVoid: boolean; canVoid: boolean }) {
  const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState<{ amount: string; method: (typeof PAYMENT_METHODS)[number]; reference: string } | null>(null);
  const [reason, setReason] = useState<string | null>(null);
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
