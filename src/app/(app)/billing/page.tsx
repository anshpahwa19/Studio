import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { fmtDate, money, money0, plural } from '@/lib/format';
import { SortHead, readSort } from '@/components/sort-head';
import { Card, Empty, Input, InvoiceStatus, PageHeader, Select, Stat } from '@/components/ui';

type Search = { q?: string; status?: string; branch?: string; from?: string; to?: string; sort?: string; dir?: string };

export default async function BillingPage({ searchParams: s }: { searchParams: Search }) {
  await requirePage('billing');
  const where: Prisma.InvoiceWhereInput = {};
  if (s.status) where.status = s.status;
  if (s.branch) where.branchId = s.branch;
  if (s.from || s.to) where.createdAt = { ...(s.from && { gte: new Date(s.from + 'T00:00:00') }), ...(s.to && { lte: new Date(s.to + 'T23:59:59') }) };
  if (s.q?.trim()) {
    const q = s.q.trim();
    where.OR = [{ number: { contains: q } }, { customer: { name: { contains: q } } }, { customer: { phone: { contains: q } } }];
  }

  const { sort, dir } = readSort(s, ['number', 'client', 'date', 'branch', 'total', 'due', 'status'], 'date', 'desc');
  const orderBy: Prisma.InvoiceOrderByWithRelationInput[] = [
    sort === 'number' ? { number: dir } : sort === 'client' ? { customer: { name: dir } } : sort === 'branch' ? { branch: { name: dir } } : sort === 'total' ? { total: dir } : sort === 'status' ? { status: dir } : { createdAt: sort === 'date' ? dir : 'desc' },
    { createdAt: 'desc' },
  ];
  const keep: Record<string, string> = Object.fromEntries(Object.entries({ q: s.q, status: s.status, branch: s.branch, from: s.from, to: s.to }).filter(([, v]) => v)) as Record<string, string>;
  const [invoices0, branches, totals, dues] = await Promise.all([
    db.invoice.findMany({ where, orderBy, take: 200, include: { customer: { select: { name: true, phone: true } }, branch: { select: { name: true } }, _count: { select: { items: true } } } }),
    db.branch.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    db.invoice.aggregate({ where: { ...where, status: s.status ?? { not: 'Cancelled' } }, _sum: { total: true, paid: true }, _count: true }),
    db.invoice.aggregate({ where: { status: { in: ['Unpaid', 'Partial'] } }, _sum: { total: true, paid: true }, _count: true }),
  ]);
  const dueOf = (i: { status: string; total: number; paid: number }) => (i.status === 'Cancelled' ? 0 : i.total - i.paid);
  const invoices = sort === 'due' ? [...invoices0].sort((a, b) => (dir === 'asc' ? 1 : -1) * (dueOf(a) - dueOf(b))) : invoices0;
  const outstanding = (dues._sum.total ?? 0) - (dues._sum.paid ?? 0);

  return (
    <>
      <PageHeader
        title="Billing & Point of Sale (POS)"
        subtitle="Fast billing counter, GST, split payments and receipts"
        actions={<Link href="/billing/new" className="rounded-xl bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-violet-700">Create New Bill (POS)</Link>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Bills shown" value={totals._count} note="Cancelled bills excluded from totals" />
        <Stat label="Billed" value={money0(totals._sum.total ?? 0)} note={`Collected ${money0(totals._sum.paid ?? 0)}`} />
        <Stat label="Outstanding dues" value={money0(outstanding)} note={`Across ${plural(dues._count, 'bill')}`} tone={outstanding > 0.5 ? 'warn' : undefined} />
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
