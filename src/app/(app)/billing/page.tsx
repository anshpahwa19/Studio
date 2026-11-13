import Link from 'next/link';
import { api } from '@/lib/api-server';
import type { listBranches, listInvoices } from '@/lib/api-reads';
import type { DataOf } from '@/lib/api-client';
import { requirePage } from '@/lib/session';
import { fmtDate, money, money0, plural } from '@/lib/format';
import { SortHead, readSort } from '@/components/sort-head';
import { Card, Empty, Input, InvoiceStatus, PageHeader, Select, Stat } from '@/components/ui';

type Search = { q?: string; status?: string; branch?: string; from?: string; to?: string; sort?: string; dir?: string };

export default async function BillingPage({ searchParams: s }: { searchParams: Search }) {
  await requirePage('billing');
  const { sort, dir } = readSort(s, ['number', 'client', 'date', 'branch', 'total', 'due', 'status'], 'date', 'desc');
  const keep: Record<string, string> = Object.fromEntries(Object.entries({ q: s.q, status: s.status, branch: s.branch, from: s.from, to: s.to }).filter(([, v]) => v)) as Record<string, string>;
  const [list, allBranches] = await Promise.all([
    api<DataOf<typeof listInvoices>>('/invoices', { q: s.q?.trim(), status: s.status, branch: s.branch, from: s.from, to: s.to, sort, dir, limit: 200 }),
    api<DataOf<typeof listBranches>>('/branches'),
  ]);
  const invoices = list.items;
  const branches = allBranches.filter((b) => b.active);
  const outstanding = list.outstanding;

  return (
    <>
      <PageHeader
        title="Billing & Point of Sale (POS)"
        subtitle="Fast billing counter, GST, split payments and receipts"
        actions={<Link href="/billing/new" className="rounded-xl bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-violet-700">Create New Bill (POS)</Link>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Bills shown" value={list.counted} note="Cancelled bills excluded from totals" />
        <Stat label="Billed" value={money0(list.billed)} note={`Collected ${money0(list.collected)}`} />
        <Stat label="Outstanding dues" value={money0(outstanding)} note={`Across ${plural(list.outstandingBills, 'bill')}`} tone={outstanding > 0.5 ? 'warn' : undefined} />
      </div>
      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto_auto]">
        {s.sort && <input type="hidden" name="sort" value={sort} />}
        {s.sort && <input type="hidden" name="dir" value={dir} />}
        <Input name="q" defaultValue={s.q} placeholder="Bill number, client name or mobile" aria-label="Search bills" />
        <Select name="status" defaultValue={s.status ?? ''} aria-label="Status">
          <option value="">Any status</option><option value="Paid">Paid</option><option value="Partial">Part paid</option><option value="Unpaid">Unpaid</option><option value="Cancelled">Cancelled</option>
        </Select>
        <Select name="branch" defaultValue={s.branch ?? ''} aria-label="Branch">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Input type="date" name="from" defaultValue={s.from} aria-label="From date" />
        <Input type="date" name="to" defaultValue={s.to} aria-label="To date" />
        <button type="submit" className="rounded-lg border border-line bg-white px-4 py-2 font-medium hover:bg-canvas">Filter</button>
      </form>
      <Card pad={false}>
        {invoices.length === 0 ? <Empty title="No bills match these filters" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr>
                <SortHead base="/billing" label="Bill" field="number" sort={sort} dir={dir} params={keep} />
                <SortHead base="/billing" label="Client" field="client" sort={sort} dir={dir} params={keep} />
                <SortHead base="/billing" label="Date" field="date" sort={sort} dir={dir} params={keep} />
                <SortHead base="/billing" label="Branch" field="branch" sort={sort} dir={dir} params={keep} />
                <SortHead base="/billing" label="Total" field="total" sort={sort} dir={dir} params={keep} right />
                <SortHead base="/billing" label="Due" field="due" sort={sort} dir={dir} params={keep} right />
                <SortHead base="/billing" label="Status" field="status" sort={sort} dir={dir} params={keep} />
              </tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-canvas/60">
                    <td><Link href={`/billing/${i.id}`} className="font-medium text-plum-600 hover:underline">{i.number}</Link><div className="text-[12px] text-ink-mute">{plural(i._count.items, 'item')}</div></td>
                    <td>{i.customer.name}<div className="text-[12px] text-ink-mute">{i.customer.phone}</div></td>
                    <td className="text-ink-soft">{fmtDate(i.createdAt)}</td>
                    <td className="text-ink-soft">{i.branch?.name ?? '—'}</td>
                    <td className="tabular text-right font-medium">{money(i.total)}</td>
                    <td className={`tabular text-right ${i.status !== 'Cancelled' && i.total - i.paid > 0.005 ? 'text-amber-700' : 'text-ink-mute'}`}>{i.status !== 'Cancelled' && i.total - i.paid > 0.005 ? money(i.total - i.paid) : '—'}</td>
                    <td><InvoiceStatus status={i.status} />{i.refunded > 0 && <div className="mt-0.5 text-[11.5px] text-rose-600">Refunded {money(i.refunded)}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
