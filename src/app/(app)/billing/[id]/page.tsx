import Link from 'next/link';
import { ArrowLeft, Scissors } from 'lucide-react';
import { api } from '@/server/api/fetch';
import type { getInvoice } from '@/server/features/billing/queries';
import type { getSettings } from '@/server/features/settings/queries';
import type { DataOf } from '@/client/api/call';
import { requirePage } from '@/server/auth/session';
import { isSenior } from '@/lib/roles';
import { fmtDate, fmtDateTime, money, rupeesInWords } from '@/lib/format';
import { InvoiceStatus } from '@/components/ui';
import { InvoiceActions } from './invoice-actions';

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const user = await requirePage('billing');
  const [inv, s] = await Promise.all([
    api<DataOf<typeof getInvoice>>(`/invoices/${params.id}`),
    api<DataOf<typeof getSettings>>('/settings'),
  ]);
  const due = inv.total - inv.paid;
  const gst = inv.tax > 0;
  const rate = inv.items[0]?.taxRate ?? 0;
  const isCancelled = inv.status === 'Cancelled';
  const label = 'text-[9pt] font-bold uppercase tracking-[0.1em] text-stone-500';

  return (
    <>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/billing" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-soft hover:text-ink"><ArrowLeft size={16} />All bills</Link>
        <InvoiceActions id={inv.id} number={inv.number} due={isCancelled ? 0 : due} isCancelled={isCancelled} canManage={isSenior(user.role)} refundable={Math.max(0, inv.paid - inv.refunded)} />
      </div>

      {/* A4 sheet: 210 × 297 mm. Scrolls sideways on small screens rather than reflowing. */}
      <div className="print-area -mx-4 overflow-x-auto bg-stone-100 px-4 py-6 sm:mx-0 sm:rounded-2xl sm:px-8 sm:py-10">
        <article id="invoice-sheet" className="print-sheet relative mx-auto flex flex-col bg-white text-[10pt] leading-snug text-stone-900 shadow-xl"
          style={{ width: '210mm', minHeight: '297mm', padding: '14mm 14mm 12mm' }}>
          {isCancelled && (
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="-rotate-[24deg] rounded-xl border-[6px] border-rose-300 px-10 py-3 text-[48pt] font-black tracking-[0.15em] text-rose-300/80">CANCELLED</span>
            </div>
          )}

          <header className="flex items-start justify-between gap-6 border-b-2 border-violet-600 pb-5">
            <div className="flex gap-4">
              <span className="flex h-[16mm] w-[16mm] shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white"><Scissors size={26} /></span>
              <div>
                <div className="text-[17pt] font-extrabold leading-tight tracking-tight">{s.name}</div>
                <div className="mt-1 text-[9pt] text-stone-600">{inv.branch ? `${inv.branch.name}, ${inv.branch.address}` : s.address}</div>
                <div className="text-[9pt] text-stone-600">{[s.phone, s.email].filter(Boolean).join(' · ')}</div>
                {gst && s.gstin && <div className="mt-1 text-[9pt] font-semibold">GSTIN: {s.gstin}</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[18pt] font-extrabold uppercase tracking-[0.08em] text-violet-700">{gst ? 'Tax Invoice' : 'Invoice'}</div>
              <div className="mt-1 text-[9pt] text-stone-500">Original for recipient</div>
            </div>
          </header>

          <section className="mt-5 grid grid-cols-4 overflow-hidden rounded-lg border border-stone-200">
            {[
              ['Invoice no.', inv.number],
              ['Invoice date', fmtDate(inv.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })],
              ['Branch', inv.branch?.name ?? '—'],
              ['Status', <InvoiceStatus key="s" status={inv.status} />],
            ].map(([k, v], i) => (
              <div key={i} className={`px-4 py-3 ${i ? 'border-l border-stone-200' : ''}`}>
                <div className={label}>{k}</div>
                <div className="mt-1 font-semibold">{v}</div>
              </div>
            ))}
          </section>

          <section className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-stone-50 px-4 py-3">
              <div className={label}>Billed to</div>
              <div className="mt-1 text-[11pt] font-bold">{inv.customer.name}</div>
              <div className="text-stone-600">{inv.customer.phone}</div>
              {inv.customer.email && <div className="text-stone-600">{inv.customer.email}</div>}
              {inv.customer.address && <div className="text-stone-600">{inv.customer.address}</div>}
            </div>
            <div className="rounded-lg bg-stone-50 px-4 py-3">
              <div className={label}>Bill details</div>
              <dl className="mt-1 space-y-0.5">
                <div className="flex justify-between gap-3"><dt className="text-stone-600">Billed by</dt><dd className="font-medium">{inv.createdBy ?? '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-stone-600">Place of supply</dt><dd className="font-medium">{s.address.split(',').pop()?.trim() || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-stone-600">GST</dt><dd className="font-medium">{gst ? `${rate}% (CGST ${rate / 2}% + SGST ${rate / 2}%)` : 'Not charged'}</dd></div>
              </dl>
            </div>
          </section>

          <table className="mt-5 w-full border-collapse text-[9.5pt]">
            <thead>
              <tr className="text-left text-[8.5pt] uppercase tracking-[0.06em] text-white [&>th]:bg-violet-600 [&>th]:shadow-[1px_0_0_#7c3aed]">
                <th className="rounded-l-md px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Rate</th>
                <th className="px-3 py-2 text-right font-semibold">Discount</th>
                <th className="px-3 py-2 text-right font-semibold">Taxable</th>
                {gst && <th className="px-3 py-2 text-right font-semibold">GST</th>}
                <th className="rounded-r-md px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {inv.items.map((i, n) => (
                <tr key={i.id} className="border-b border-stone-200 align-top">
                  <td className="px-3 py-2.5 text-stone-500">{n + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold">{i.name}</div>
                    <div className="text-[8.5pt] text-stone-500">{i.kind === 'service' ? 'Service' : 'Product'}{i.staff && ` · by ${i.staff.name}`}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right">{i.qty}</td>
                  <td className="px-3 py-2.5 text-right">{money(i.unitPrice)}</td>
                  <td className="px-3 py-2.5 text-right">{i.discount ? money(i.discount) : '—'}</td>
                  <td className="px-3 py-2.5 text-right">{money(i.qty * i.unitPrice - i.discount)}</td>
                  {gst && <td className="px-3 py-2.5 text-right">{money(i.tax)}<div className="text-[8pt] text-stone-500">{i.taxRate}%</div></td>}
                  <td className="px-3 py-2.5 text-right font-semibold">{money(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="mt-5 grid grid-cols-[1fr_74mm] gap-6">
            <div className="space-y-4">
              <div>
                <div className={label}>Amount in words</div>
                <div className="mt-1 font-semibold italic">{rupeesInWords(inv.total)}</div>
              </div>
              {inv.payments.length > 0 && (
                <div>
                  <div className={label}>Payments received</div>
                  <ul className="mt-1 space-y-0.5 text-[9pt]">
                    {inv.payments.map((p) => (
                      <li key={p.id} className="tabular flex justify-between gap-3 border-b border-dashed border-stone-200 py-0.5">
                        <span>{fmtDateTime(p.createdAt)} · {p.method}{p.reference && ` (${p.reference})`}</span><span className="font-medium">{money(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {inv.refunds.length > 0 && (
                <div>
                  <div className={label}>Refunds given</div>
                  <ul className="mt-1 space-y-0.5 text-[9pt]">
                    {inv.refunds.map((r) => (
                      <li key={r.id} className="tabular flex justify-between gap-3 border-b border-dashed border-stone-200 py-0.5">
                        <span>{fmtDateTime(r.createdAt)} · {r.method} · {r.reason}</span><span className="font-medium text-rose-700">− {money(r.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {inv.notes && <div><div className={label}>Notes</div><p className="mt-1 whitespace-pre-line text-[9pt] text-stone-600">{inv.notes}</p></div>}
            </div>
            <dl className="tabular self-start overflow-hidden rounded-lg border border-stone-200">
              <div className="flex justify-between px-4 py-1.5"><dt className="text-stone-600">Subtotal</dt><dd>{money(inv.subtotal)}</dd></div>
              {inv.discount > 0 && <div className="flex justify-between px-4 py-1.5"><dt className="text-stone-600">Discount{inv.discountType === 'percent' && ` (${inv.discountValue}%)`}</dt><dd>− {money(inv.discount)}</dd></div>}
              {gst ? (
                <>
                  <div className="flex justify-between px-4 py-1.5"><dt className="text-stone-600">CGST @ {rate / 2}%</dt><dd>{money(inv.tax / 2)}</dd></div>
                  <div className="flex justify-between px-4 py-1.5"><dt className="text-stone-600">SGST @ {rate / 2}%</dt><dd>{money(inv.tax / 2)}</dd></div>
                </>
              ) : <div className="flex justify-between px-4 py-1.5"><dt className="text-stone-600">GST</dt><dd>Not charged</dd></div>}
              <div className="flex justify-between bg-violet-600 px-4 py-2.5 text-[12pt] font-bold text-white"><dt>Total</dt><dd>{money(inv.total)}</dd></div>
              <div className="flex justify-between px-4 py-1.5"><dt className="text-stone-600">Paid</dt><dd>{money(inv.paid)}</dd></div>
              {inv.refunded > 0 && <div className="flex justify-between px-4 py-1.5"><dt className="text-stone-600">Refunded</dt><dd className="text-rose-700">− {money(inv.refunded)}</dd></div>}
              {!isCancelled && due > 0.005 && <div className="flex justify-between bg-amber-50 px-4 py-1.5 font-bold text-amber-800"><dt>Balance due</dt><dd>{money(due)}</dd></div>}
            </dl>
          </section>

          <footer className="mt-auto pt-10">
            <div className="flex items-end justify-between gap-6">
              <p className="max-w-[100mm] text-[9pt] text-stone-600">{s.invoiceFooter}</p>
              <div className="w-[60mm] text-center">
                <div className="h-[14mm] border-b border-stone-400" />
                <div className="mt-1 text-[8.5pt] text-stone-600">For {s.name}<br />Authorised signatory</div>
              </div>
            </div>
            <div className="mt-6 border-t border-stone-200 pt-2 text-center text-[8pt] text-stone-400">This is a computer-generated invoice.</div>
          </footer>
        </article>
      </div>
    </>
  );
}
