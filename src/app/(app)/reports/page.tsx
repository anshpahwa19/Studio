import Link from 'next/link';
import { api } from '@/lib/api-server';
import type { listBranches, report } from '@/lib/api-reads';
import type { DataOf } from '@/lib/api-client';
import { requirePage } from '@/lib/session';
import { fmtDate, money0, plural } from '@/lib/format';
import { BarChart } from '@/components/bar-chart';
import { Card, Empty, Input, PageHeader, Stat, cx } from '@/components/ui';
import { PRESETS, resolvePeriod } from './period';
import { BranchSelect } from './branch-select';

export default async function ReportsPage({ searchParams }: { searchParams: { period?: string; from?: string; to?: string; branch?: string } }) {
  await requirePage('reports');
  const { key, from, to } = resolvePeriod(searchParams);
  const branches = await api<DataOf<typeof listBranches>>('/branches');
  // One branch, or everything combined when no branch is chosen.
  const branch = branches.some((b) => b.id === searchParams.branch) ? searchParams.branch! : '';
  const branchName = branches.find((b) => b.id === branch)?.name;
  const r = await api<DataOf<typeof report>>('/reports', { from, to, branch });

  const net = r.netSales, spent = r.expenses, tax = r.tax, collected = r.collected, dues = r.dues, discounts = r.discounts;
  const invoices = { length: r.bills };
  const expenses = { length: r.expenseCount };
  const byMonth = r.salesBy === 'month';
  const chart = r.salesSeries.map(({ date, value }) => ({ label: byMonth ? fmtDate(`${date}-01`, { month: 'short' }) : fmtDate(date, { day: 'numeric', month: 'short' }), value }));
  const top = (kind: string) => (kind === 'service' ? r.topServices : r.topProducts);
  const methods = r.paymentMethods;
  const expenseCats = r.expenseCategories;
  const perf = r.staffPerformance.map((p) => ({ key: p.staffId, qty: p.qty, value: p.value, name: p.name, rate: p.commissionRate, salaried: p.salaried }));
  const compare = r.branchComparison.map((b) => ({ id: b.branchId, name: b.name, bills: b.bills, net: b.netSales, spent: b.expenses, profit: b.profit, collected: b.collected }));

  const qs = `${key === 'custom' ? `from=${from}&to=${to}` : `period=${key}`}${branch ? `&branch=${branch}` : ''}`;
  const periodQs = branch ? `&branch=${branch}` : '';

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle={`${fmtDate(from)} to ${fmtDate(to)} · ${branchName ?? 'All branches combined'}`}
        actions={
          <>
            <a href={`/reports/export?type=invoices&${qs}`} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] font-medium hover:bg-canvas">Export sales (CSV)</a>
            <a href={`/reports/export?type=expenses&${qs}`} className="rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] font-medium hover:bg-canvas">Export expenses (CSV)</a>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {branches.length > 0 && <BranchSelect branches={branches} value={branch} />}
        {Object.entries(PRESETS).map(([k, label]) => (
          <Link key={k} href={`/reports?period=${k}${periodQs}`} className={cx('rounded-full border px-3 py-1 text-[13px] font-medium', key === k ? 'border-plum-600 bg-plum-600 text-white' : 'border-line bg-white text-ink-soft hover:bg-canvas')}>{label}</Link>
        ))}
        <form className="flex flex-wrap items-center gap-2">
          {branch && <input type="hidden" name="branch" value={branch} />}
          <Input type="date" name="from" defaultValue={from} className="w-auto py-1" aria-label="From" />
          <span className="text-ink-mute">to</span>
          <Input type="date" name="to" defaultValue={to} className="w-auto py-1" aria-label="To" />
          <button type="submit" className="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium hover:bg-canvas">Apply</button>
        </form>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sales before GST" value={money0(net)} note={`${plural(invoices.length, 'sale')} · ${money0(discounts)} discounts given`} />
        <Stat label="Expenses" value={money0(spent)} note={plural(expenses.length, 'entry', 'entries')} />
        <Stat label="Profit" value={money0(net - spent)} note="Sales before GST minus expenses" tone={net - spent < 0 ? 'warn' : 'good'} />
        <Stat label="Collected" value={money0(collected)} note={`GST billed ${money0(tax)} · Dues ${money0(dues)}`} />
      </div>

      {compare.length > 0 && (
        <Card title="By branch" subtitle="Each branch for this period, with the combined total at the bottom" pad={false} className="mb-6">
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Branch</th><th className="text-right">Sales</th><th className="text-right">Sales before GST</th><th className="text-right">Expenses</th><th className="text-right">Profit</th><th className="text-right">Collected</th></tr></thead>
              <tbody>
                {compare.map((r) => (
                  <tr key={r.id ?? 'none'} className="hover:bg-canvas/60">
                    <td className="font-medium">{r.id ? <Link href={`/reports?${qs}&branch=${r.id}`} className="hover:text-violet-700">{r.name}</Link> : <span className="text-ink-soft">{r.name}</span>}</td>
                    <td className="tabular text-right">{r.bills}</td>
                    <td className="tabular text-right">{money0(r.net)}</td>
                    <td className="tabular text-right">{money0(r.spent)}</td>
                    <td className={cx('tabular text-right font-medium', r.profit < 0 && 'text-amber-700')}>{money0(r.profit)}</td>
                    <td className="tabular text-right">{money0(r.collected)}</td>
                  </tr>
                ))}
                <tr className="bg-canvas/60 font-semibold">
                  <td>All branches combined</td>
                  <td className="tabular text-right">{invoices.length}</td>
                  <td className="tabular text-right">{money0(net)}</td>
                  <td className="tabular text-right">{money0(spent)}</td>
                  <td className={cx('tabular text-right', net - spent < 0 && 'text-amber-700')}>{money0(net - spent)}</td>
                  <td className="tabular text-right">{money0(collected)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
