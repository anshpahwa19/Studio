import Link from 'next/link';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { addDays, fmtDate, isoDate, money0, parseDate, plural } from '@/lib/format';
import { BarChart } from '@/components/bar-chart';
import { Card, Empty, Input, PageHeader, Stat, cx } from '@/components/ui';
import { PRESETS, range, resolvePeriod } from './period';

export default async function ReportsPage({ searchParams }: { searchParams: { period?: string; from?: string; to?: string } }) {
  await requirePage('reports');
  const { key, from, to } = resolvePeriod(searchParams);
  const when = range(from, to);

  const [invoices, payments, expenses, staff] = await Promise.all([
    db.invoice.findMany({ where: { createdAt: when, status: { not: 'Void' } }, include: { items: true } }),
    db.payment.findMany({ where: { createdAt: when, invoice: { status: { not: 'Void' } } } }),
    db.expense.findMany({ where: { date: { gte: from, lte: to } } }),
    db.staff.findMany({ select: { id: true, name: true, payType: true, commissionRate: true, active: true } }),
  ]);

  const sales = sum(invoices.map((i) => i.total));
  const tax = sum(invoices.map((i) => i.tax));
  const net = sales - tax;
  const collected = sum(payments.map((p) => p.amount));
  const spent = sum(expenses.map((e) => e.amount));
  const dues = sum(invoices.map((i) => i.total - i.paid));
  const discounts = sum(invoices.map((i) => i.discount));

  // Sales before GST over time, by day for short ranges and by month for long ones.
  const days = Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000) + 1;
  const byMonth = days > 62;
  const buckets = new Map<string, number>();
  if (byMonth) for (let d = from; d <= to; d = addDays(d, 28)) buckets.set(d.slice(0, 7), 0);
  else for (let i = 0; i < days; i++) buckets.set(addDays(from, i), 0);
  if (byMonth) buckets.set(to.slice(0, 7), buckets.get(to.slice(0, 7)) ?? 0);
  for (const i of invoices) {
    const k = byMonth ? isoDate(i.createdAt).slice(0, 7) : isoDate(i.createdAt);
    buckets.set(k, (buckets.get(k) ?? 0) + i.total - i.tax);
  }
  const chart = [...buckets].map(([k, value]) => ({ label: byMonth ? fmtDate(`${k}-01`, { month: 'short' }) : fmtDate(k, { day: 'numeric', month: 'short' }), value }));

  const items = invoices.flatMap((i) => i.items);
  const top = (kind: string) => group(items.filter((i) => i.kind === kind), (i) => i.name, (i) => ({ qty: i.qty, value: i.total - i.tax })).slice(0, 8);
  const methods = group(payments, (p) => p.method, (p) => ({ qty: 1, value: p.amount }));
  const expenseCats = group(expenses, (e) => e.category, (e) => ({ qty: 1, value: e.amount }));
  const staffMap = new Map(staff.map((s) => [s.id, s]));
  const perf = group(items.filter((i) => i.kind === 'service' && i.staffId), (i) => i.staffId!, (i) => ({ qty: i.qty, value: i.total - i.tax }))
    .map((r) => { const s = staffMap.get(r.key); return { ...r, name: s?.name ?? 'Former staff', rate: s?.commissionRate ?? 0, salaried: s?.payType === 'Salary' }; });

  const qs = key === 'custom' ? `from=${from}&to=${to}` : `period=${key}`;

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle={`${fmtDate(from)} to ${fmtDate(to)}`}
        actions={
          <>
            <a href={`/reports/export?type=invoices&${qs}`} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] font-medium hover:bg-canvas">Export bills (CSV)</a>
            <a href={`/reports/export?type=expenses&${qs}`} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] font-medium hover:bg-canvas">Export expenses (CSV)</a>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {Object.entries(PRESETS).map(([k, label]) => (
          <Link key={k} href={`/reports?period=${k}`} className={cx('rounded-full border px-3 py-1 text-[13px] font-medium', key === k ? 'border-plum-600 bg-plum-600 text-white' : 'border-line bg-white text-ink-soft hover:bg-canvas')}>{label}</Link>
        ))}
        <form className="flex flex-wrap items-center gap-2">
          <Input type="date" name="from" defaultValue={from} className="w-auto py-1" aria-label="From" />
          <span className="text-ink-mute">to</span>
          <Input type="date" name="to" defaultValue={to} className="w-auto py-1" aria-label="To" />
          <button type="submit" className="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium hover:bg-canvas">Apply</button>
        </form>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sales before GST" value={money0(net)} note={`${plural(invoices.length, 'bill')} · ${money0(discounts)} discounts given`} />
        <Stat label="Expenses" value={money0(spent)} note={plural(expenses.length, 'entry', 'entries')} />
        <Stat label="Profit" value={money0(net - spent)} note="Sales before GST minus expenses" tone={net - spent < 0 ? 'warn' : 'good'} />
        <Stat label="Collected" value={money0(collected)} note={`GST billed ${money0(tax)} · Dues ${money0(dues)}`} />
      </div>

      <Card title={byMonth ? 'Sales by month (before GST)' : 'Sales by day (before GST)'} className="mb-6">
        {invoices.length ? <BarChart data={chart} height={200} /> : <Empty title="No sales in this period" />}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Staff performance" pad={false}>
          {perf.length === 0 ? <Empty title="No services billed with a stylist" /> : (
            <div className="overflow-x-auto"><table className="table">
              <thead><tr><th>Stylist</th><th className="text-right">Services</th><th className="text-right">Revenue</th><th className="text-right">Commission</th></tr></thead>
              <tbody>{perf.map((r) => (
                <tr key={r.key}><td className="font-medium">{r.name}</td><td className="tabular text-right">{r.qty}</td><td className="tabular text-right">{money0(r.value)}</td><td className="tabular text-right">{r.salaried ? <span className="text-ink-mute">Salaried</span> : <>{money0((r.value * r.rate) / 100)}<div className="text-[11.5px] text-ink-mute">{r.rate}%</div></>}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
        <Breakdown title="Top services" rows={top('service')} qtyLabel="Sold" />
        <Breakdown title="Top products" rows={top('product')} qtyLabel="Units" />
        <Breakdown title="Payments by method" rows={methods} qtyLabel="Payments" />
        <Breakdown title="Expenses by category" rows={expenseCats} qtyLabel="Entries" />
      </div>
    </>
  );
}

function Breakdown({ title, rows, qtyLabel }: { title: string; rows: { key: string; qty: number; value: number }[]; qtyLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card title={title}>
      {rows.length === 0 ? <p className="text-ink-mute">Nothing in this period.</p> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-3 text-[13px]"><span className="min-w-0 truncate">{r.key}</span><span className="tabular shrink-0"><span className="text-ink-mute">{r.qty} {qtyLabel.toLowerCase()} · </span><span className="font-medium">{money0(r.value)}</span></span></div>
              <div className="mt-1 h-1.5 rounded-full bg-canvas"><div className="h-1.5 rounded-full bg-plum-500" style={{ width: `${(r.value / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
function group<T>(xs: T[], key: (x: T) => string, val: (x: T) => { qty: number; value: number }) {
  const m = new Map<string, { key: string; qty: number; value: number }>();
  for (const x of xs) {
    const k = key(x);
    const v = val(x);
    const cur = m.get(k) ?? { key: k, qty: 0, value: 0 };
    m.set(k, { key: k, qty: cur.qty + v.qty, value: cur.value + v.value });
  }
  return [...m.values()].sort((a, b) => b.value - a.value);
}
