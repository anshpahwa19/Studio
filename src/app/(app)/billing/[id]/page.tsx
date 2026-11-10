import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { isSenior } from '@/lib/roles';
import { fmtDate, fmtDateTime, money } from '@/lib/format';
import { InvoiceStatus } from '@/components/ui';
import { InvoiceActions } from './invoice-actions';

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const user = await requirePage('billing');
  const [inv, s] = await Promise.all([
    db.invoice.findUnique({
      where: { id: params.id },
      include: { customer: true, branch: true, items: { include: { staff: { select: { name: true } } } }, payments: { orderBy: { createdAt: 'asc' } } },
    }),
    db.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!inv || !s) notFound();
  const due = inv.total - inv.paid;

  return (
    <>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/billing" className="text-[13px] text-ink-mute hover:text-ink">← All bills</Link>
        <InvoiceActions id={inv.id} due={inv.status === 'Void' ? 0 : due} isVoid={inv.status === 'Void'} canVoid={isSenior(user.role)} />
      </div>

      <article className="print-sheet card mx-auto max-w-3xl p-8 sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <div className="font-display text-[24px] leading-tight">{s.name}</div>
            <div className="mt-1 whitespace-pre-line text-[12.5px] text-ink-soft">
              {inv.branch ? `${inv.branch.name}, ${inv.branch.address}` : s.address}
              {s.phone && `\n${s.phone}`}{s.email && ` · ${s.email}`}
            </div>
            {s.gstin && <div className="mt-1 text-[12.5px] font-medium">GSTIN {s.gstin}</div>}
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-500">Tax invoice</div>
            <div className="mt-1 text-[20px] font-semibold">{inv.number}</div>
            <div className="text-[12.5px] text-ink-soft">{fmtDate(inv.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div className="mt-2"><InvoiceStatus status={inv.status} /></div>
          </div>
        </header>

        <section className="grid gap-4 py-5 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Billed to</div>
            <div className="mt-1 font-medium">{inv.customer.name}</div>
            <div className="text-[12.5px] text-ink-soft">{inv.customer.phone}{inv.customer.email && ` · ${inv.customer.email}`}</div>
          </div>
          {inv.createdBy && <div className="sm:text-right"><div className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Billed by</div><div className="mt-1">{inv.createdBy}</div></div>}
        </section>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-y border-line text-left text-[11px] uppercase tracking-wide text-ink-mute">
                <th className="py-2 pr-2 font-semibold">Item</th>
                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                <th className="px-2 py-2 text-right font-semibold">Rate</th>
                <th className="px-2 py-2 text-right font-semibold">Discount</th>
                <th className="px-2 py-2 text-right font-semibold">GST</th>
                <th className="py-2 pl-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {inv.items.map((i) => (
                <tr key={i.id} className="border-b border-line/70">
                  <td className="py-2.5 pr-2"><div className="font-medium">{i.name}</div>{i.staff && <div className="text-[11.5px] text-ink-mute">by {i.staff.name}</div>}</td>
                  <td className="px-2 text-right">{i.qty}</td>
                  <td className="px-2 text-right">{money(i.unitPrice)}</td>
                  <td className="px-2 text-right">{i.discount ? money(i.discount) : '—'}</td>
                  <td className="px-2 text-right">{money(i.tax)}<div className="text-[11px] text-ink-mute">{i.taxRate}%</div></td>
                  <td className="pl-2 text-right font-medium">{money(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-5 flex flex-wrap justify-between gap-6">
          <div className="min-w-[200px] flex-1">
            {inv.payments.length > 0 && (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Payments</div>
                <ul className="mt-1 space-y-0.5 text-[12.5px]">
                  {inv.payments.map((p) => (
                    <li key={p.id} className="tabular">{fmtDateTime(p.createdAt)} · {p.method}{p.reference && ` (${p.reference})`} · {money(p.amount)}</li>
                  ))}
                </ul>
              </>
            )}
            {inv.notes && <p className="mt-3 whitespace-pre-line text-[12.5px] text-ink-soft">{inv.notes}</p>}
          </div>
          <dl className="tabular w-64 space-y-1 text-[13px]">
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{money(inv.subtotal)}</dd></div>
            {inv.discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount{inv.discountType === 'percent' && ` (${inv.discountValue}%)`}</dt><dd>− {money(inv.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-soft">CGST</dt><dd>{money(inv.tax / 2)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">SGST</dt><dd>{money(inv.tax / 2)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1.5 text-[15px] font-semibold"><dt>Total</dt><dd>{money(inv.total)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Paid</dt><dd>{money(inv.paid)}</dd></div>
            {inv.status !== 'Void' && due > 0.005 && <div className="flex justify-between font-semibold text-amber-700"><dt>Balance due</dt><dd>{money(due)}</dd></div>}
          </dl>
        </section>

        {s.invoiceFooter && <footer className="mt-8 border-t border-line pt-4 text-center text-[12px] text-ink-mute">{s.invoiceFooter}</footer>}
      </article>
    </>
  );
}
