'use client';
import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Plus } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Input, Select, Textarea, type Tone } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { fmtDate, money } from '@/lib/format';
import { billStatus, dueOf } from '@/lib/purchases';
import { PAYMENT_METHODS } from '@/lib/validate';
import { addPayment, deleteBill, deletePayment, saveBill, type BillInput, type PaymentInput } from './api';

type Payment = { id: string; date: string; amount: number; method: string; reference: string | null };
type Bill = { id: string; billNumber: string | null; fileName: string | null; date: string; dueDate: string | null; amount: number; paid: number; notes: string | null; payments: Payment[] };
const TONE: Record<string, Tone> = { Paid: 'green', Partial: 'amber', Unpaid: 'red' };

export function BillsManager({ supplier, bills, today, editable }: { supplier: { id: string; name: string }; bills: Bill[]; today: string; editable: boolean }) {
  const [bill, setBill] = useState<(BillInput & { file?: File | null; removeFile?: boolean; hadFile?: string | null }) | null>(null);
  const [pay, setPay] = useState<{ bill: Bill; f: PaymentInput } | null>(null);
  const [del, setDel] = useState<Bill | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'due'>('all');
  const { run, pending } = useAction();
  const shown = bills.filter((b) => filter === 'all' || dueOf(b) > 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-line bg-white p-1">
          {([['all', 'All bills'], ['due', 'With balance due']] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-lg px-4 py-1.5 text-[14px] font-semibold ${filter === k ? 'bg-violet-600 text-white' : 'text-ink-soft hover:bg-stone-100'}`}>{label}</button>
          ))}
        </div>
        {editable && <Button className="ml-auto" onClick={() => setBill({ supplierId: supplier.id, billNumber: '', date: today, dueDate: '', amount: '' as unknown as number, notes: '', paidNow: '' as unknown as number, method: 'Bank' })}><Plus size={16} />Add bill</Button>}
      </div>

      <Card pad={false}>
        {shown.length === 0 ? <Empty title={bills.length ? 'No bills with a balance due' : 'No bills yet'}>{!bills.length && 'Record each bill you receive from this supplier, then the payments you make against it.'}</Empty> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th />{['Bill', 'Date', 'Due by'].map((h) => <th key={h}>{h}</th>)}<th className="text-right">Amount</th><th className="text-right">Paid</th><th className="text-right">Due</th><th>Status</th>{editable && <th />}</tr></thead>
              <tbody>
                {shown.map((b) => {
                  const st = billStatus(b);
                  const late = st !== 'Paid' && b.dueDate && b.dueDate < today;
                  return (
                    <Fragment key={b.id}>
                      <tr className="hover:bg-canvas/60">
                        <td className="w-8 pr-0"><button type="button" aria-label="Show payments" aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)} className="rounded p-1 text-ink-mute hover:bg-stone-100">{open === b.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></td>
                        <td>
                          <div className="font-medium">{b.billNumber || `Bill of ${fmtDate(b.date, { day: 'numeric', month: 'short' })}`}</div>
                          {b.fileName && <a href={`/api/supplier-bills/${b.id}/file`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-violet-600 hover:underline"><FileText size={13} />View bill</a>}{b.notes && <div className="max-w-[220px] truncate text-[12px] text-ink-mute" title={b.notes}>{b.notes}</div>}</td>
                        <td className="whitespace-nowrap text-ink-soft">{fmtDate(b.date)}</td>
                        <td className={`whitespace-nowrap ${late ? 'font-medium text-rose-600' : 'text-ink-soft'}`}>{b.dueDate ? fmtDate(b.dueDate) : '—'}{late && <div className="text-[11.5px]">Overdue</div>}</td>
                        <td className="tabular text-right">{money(b.amount)}</td>
                        <td className="tabular text-right text-ink-soft">{money(b.paid)}</td>
                        <td className={`tabular text-right ${dueOf(b) > 0 ? 'font-medium text-amber-700' : 'text-ink-mute'}`}>{dueOf(b) > 0 ? money(dueOf(b)) : '—'}</td>
                        <td><Badge tone={TONE[st]}>{st === 'Partial' ? 'Part paid' : st}</Badge></td>
                        {editable && (
                          <td className="whitespace-nowrap text-right">
                            {st !== 'Paid' && <Button size="sm" variant="secondary" onClick={() => setPay({ bill: b, f: { billId: b.id, date: today, amount: dueOf(b), method: 'Bank', reference: '' } })}>Pay</Button>}
                            <Button size="sm" variant="ghost" onClick={() => setBill({ id: b.id, supplierId: supplier.id, billNumber: b.billNumber ?? '', date: b.date, dueDate: b.dueDate ?? '', amount: b.amount, notes: b.notes ?? '', hadFile: b.fileName })}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => setDel(b)}>Delete</Button>
                          </td>
                        )}
                      </tr>
                      {open === b.id && (
                        <tr className="bg-stone-50">
                          <td />
                          <td colSpan={editable ? 8 : 7} className="py-3">
                            {b.payments.length === 0 ? <span className="text-ink-mute">No payments yet.</span> : (
                              <ul className="space-y-1.5">
                                {b.payments.map((p) => (
                                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 text-[13px]">
                                    <span className="w-24 text-ink-soft">{fmtDate(p.date)}</span>
                                    <span className="tabular w-28 font-medium">{money(p.amount)}</span>
                                    <span className="text-ink-soft">{p.method}{p.reference && ` · ${p.reference}`}</span>
                                    {editable && <button type="button" disabled={pending} onClick={() => run(() => deletePayment(p.id), 'Payment removed')} className="ml-auto text-[12.5px] text-rose-600 hover:underline">Remove</button>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!bill} onClose={() => setBill(null)} title={bill?.id ? 'Edit bill' : `Add bill · ${supplier.name}`}>
        {bill && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => { e.preventDefault(); const fd = new FormData();
            for (const k of ['id', 'supplierId', 'billNumber', 'date', 'dueDate', 'amount', 'notes', 'paidNow', 'method'] as const) {
              const val = bill[k]; if (val !== undefined && val !== null) fd.set(k, String(val));
            }
            if (bill.file) fd.set('file', bill.file);
            if (bill.removeFile) fd.set('removeFile', '1');
            if ((await run(() => saveBill(fd), 'Bill saved')) !== false) setBill(null); }}>
            <Field label="Bill amount (₹)" hint="Total payable including GST"><Input type="number" min="0.01" step="0.01" value={bill.amount} onChange={(e) => setBill({ ...bill, amount: e.target.value as unknown as number })} required autoFocus /></Field>
            <Field label="Bill number (optional)"><Input value={bill.billNumber ?? ''} onChange={(e) => setBill({ ...bill, billNumber: e.target.value })} /></Field>
            <Field label="Upload the bill" hint={bill.id && bill.hadFile && !bill.removeFile ? `Current file: ${bill.hadFile}. Choose another to replace it.` : 'PDF or photo, up to 5 MB'} className="col-span-2">
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setBill({ ...bill, file: e.target.files?.[0] ?? null })}
                className="block w-full cursor-pointer rounded-lg border border-line bg-white text-[13.5px] file:mr-3 file:cursor-pointer file:border-0 file:bg-violet-50 file:px-4 file:py-2.5 file:text-[13.5px] file:font-semibold file:text-violet-700 hover:file:bg-violet-100" />
            </Field>
            {bill.id && bill.hadFile && !bill.file && (
              <label className="col-span-2 flex items-center gap-2 text-[13.5px] text-ink-soft"><input type="checkbox" checked={!!bill.removeFile} onChange={(e) => setBill({ ...bill, removeFile: e.target.checked })} className="h-4 w-4 accent-violet-600" />Remove the uploaded bill</label>
            )}
            <Field label="Bill date"><Input type="date" value={bill.date} onChange={(e) => setBill({ ...bill, date: e.target.value })} required /></Field>
            <Field label="Pay by (optional)"><Input type="date" value={bill.dueDate ?? ''} min={bill.date} onChange={(e) => setBill({ ...bill, dueDate: e.target.value })} /></Field>
            {!bill.id && (
              <>
                <Field label="Paid now (₹)" hint="Leave blank if nothing is paid yet"><Input type="number" min="0" step="0.01" value={bill.paidNow ?? ''} onChange={(e) => setBill({ ...bill, paidNow: e.target.value as unknown as number })} /></Field>
                <Field label="Paid via"><Select value={bill.method ?? 'Bank'} onChange={(e) => setBill({ ...bill, method: e.target.value as BillInput['method'] })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
              </>
            )}
            <Field label="Notes (optional)" className="col-span-2"><Textarea value={bill.notes ?? ''} onChange={(e) => setBill({ ...bill, notes: e.target.value })} /></Field>
            <div className="col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setBill(null)}>Cancel</Button><Button type="submit" disabled={pending}>Save bill</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!pay} onClose={() => setPay(null)} title={pay ? `Pay bill ${pay.bill.billNumber || fmtDate(pay.bill.date)}` : ''}>
        {pay && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => { e.preventDefault(); if ((await run(() => addPayment(pay.f), 'Payment recorded')) !== false) setPay(null); }}>
            <p className="col-span-2 text-ink-soft">{money(dueOf(pay.bill))} is still due of {money(pay.bill.amount)}.</p>
            <Field label="Amount (₹)"><Input type="number" min="0.01" step="0.01" max={dueOf(pay.bill)} value={pay.f.amount} onChange={(e) => setPay({ ...pay, f: { ...pay.f, amount: e.target.value as unknown as number } })} required autoFocus /></Field>
            <Field label="Date paid"><Input type="date" value={pay.f.date} onChange={(e) => setPay({ ...pay, f: { ...pay.f, date: e.target.value } })} required /></Field>
            <Field label="Paid via"><Select value={pay.f.method} onChange={(e) => setPay({ ...pay, f: { ...pay.f, method: e.target.value as PaymentInput['method'] } })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
            <Field label="Reference"><Input value={pay.f.reference ?? ''} onChange={(e) => setPay({ ...pay, f: { ...pay.f, reference: e.target.value } })} placeholder="UPI ref, cheque no." /></Field>
            <div className="col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setPay(null)}>Cancel</Button><Button type="submit" disabled={pending}>Record payment</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this bill?">
        <p className="text-ink-soft">Bill {del?.billNumber || del?.date} for {del && money(del.amount)} will be removed{del && del.payments.length > 0 ? `, along with its ${del.payments.length} recorded payment${del.payments.length > 1 ? 's' : ''}` : ''}. This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDel(null)}>Keep</Button>
          <Button variant="danger" disabled={pending} onClick={async () => { if ((await run(() => deleteBill(del!.id), 'Bill deleted')) !== false) setDel(null); }}>Delete bill</Button>
        </div>
      </Modal>
    </>
  );
}
