import { db } from '@/lib/db';
import { fmtDate, parseDate } from '@/lib/format';
import { Card, Empty, PageHeader, Stat } from '@/components/ui';
import { MonthPicker } from './month-picker';
import { BranchPicker } from './branch-picker';
import { StockTabs } from './stock-tabs';

/** Stock for one month: opening count, what came in, what went out, and the closing count, per product. */
export async function MonthlyPage({ month, branch, branches }: { month: string; branch: string; branches: { id: string; name: string }[] }) {
  const inBranch = branch ? { branchId: branch } : {};
  const from = parseDate(`${month}-01`);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const [products, before, during, received] = await Promise.all([
    db.product.findMany({ orderBy: { name: 'asc' } }),
    db.stockMovement.groupBy({ by: ['productId'], where: { createdAt: { lt: from }, ...inBranch }, _sum: { change: true } }),
    db.stockMovement.groupBy({ by: ['productId', 'type'], where: { createdAt: { gte: from, lt: to }, ...inBranch }, _sum: { change: true } }),
    db.stockMovement.findMany({ where: { type: 'IN', createdAt: { gte: from, lt: to }, ...inBranch }, orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true, unit: true } }, supplier: { select: { name: true } }, branch: { select: { name: true } } } }),
  ]);

  const opening = new Map(before.map((b) => [b.productId, b._sum.change ?? 0]));
  const sum = (id: string, ...types: string[]) => during.filter((m) => m.productId === id && types.includes(m.type)).reduce((a, m) => a + (m._sum.change ?? 0), 0);
  const rows = products
    .map((p) => {
      const open = opening.get(p.id) ?? 0;
      const inn = sum(p.id, 'IN'), sold = sum(p.id, 'SALE', 'RETURN'), used = sum(p.id, 'OUT'), adj = sum(p.id, 'ADJUST'), moved = sum(p.id, 'TRANSFER');
      return { p, open, inn, sold: -sold, used: -used, adj, moved, close: open + inn + sold + used + adj + moved };
    })
    .filter((r) => r.p.active || r.open || r.inn || r.sold || r.used || r.adj || r.moved);
  const totalReceived = rows.reduce((a, r) => a + r.inn, 0);
  const label = fmtDate(from, { month: 'long', year: 'numeric' });
  const num = 'tabular text-right';

  return (
    <>
      <PageHeader title="Inventory & Stock" subtitle={`${label} · ${branches.find((b) => b.id === branch)?.name ?? 'All branches combined'}. Opening, received, used and closing stock for each product.`} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <StockTabs view="month" month={month} branch={branch} />
        {branches.length > 0 && <BranchPicker branches={branches} value={branch} />}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3"><MonthPicker month={month} branch={branch} /></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Products received" value={new Set(received.map((r) => r.productId)).size} note={`${received.length} deliveries in ${label}`} />
        <Stat label="Units received" value={totalReceived} tone="good" />
        <Stat label="Units sold" value={rows.reduce((a, r) => a + r.sold, 0)} />
      </div>

      <Card title="Stock by product" pad={false}>
        {rows.length === 0 ? <Empty title="No stock activity this month" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Product</th><th className="text-right">Opening</th><th className="text-right">Received</th><th className="text-right">Sold</th><th className="text-right">Used / removed</th><th className="text-right">Corrections</th>{branch && <th className="text-right">Transfers</th>}<th className="text-right">Closing</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.p.id} className="hover:bg-canvas/60">
                    <td><div className="font-medium">{r.p.name}</div><div className="text-[12px] text-ink-mute">{r.p.category}{!r.p.active && ' · Archived'}</div></td>
                    <td className={`${num} text-ink-soft`}>{r.open}</td>
                    <td className={`${num} ${r.inn ? 'font-medium text-emerald-700' : 'text-ink-mute'}`}>{r.inn ? `+${r.inn}` : '—'}</td>
                    <td className={num}>{r.sold || '—'}</td>
                    <td className={num}>{r.used || '—'}</td>
                    <td className={num}>{r.adj ? `${r.adj > 0 ? '+' : ''}${r.adj}` : '—'}</td>
                    {branch && <td className={num}>{r.moved ? `${r.moved > 0 ? '+' : ''}${r.moved}` : '—'}</td>}
                    <td className={`${num} font-semibold`}>{r.close} <span className="text-[12px] font-normal text-ink-mute">{r.p.unit}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-5">
        <Card title="New stock added" subtitle={`Every delivery received in ${label}`} pad={false}>
          {received.length === 0 ? <Empty title="No stock received this month" /> : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Date</th><th>Product</th><th className="text-right">Quantity</th>{!branch && branches.length > 0 && <th>Branch</th>}<th>Supplier</th><th>Note</th></tr></thead>
                <tbody>
                  {received.map((m) => (
                    <tr key={m.id} className="hover:bg-canvas/60">
                      <td className="whitespace-nowrap text-ink-soft">{fmtDate(m.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="font-medium">{m.product.name}</td>
                      <td className={`${num} font-medium text-emerald-700`}>+{m.change} {m.product.unit}</td>
                      {!branch && branches.length > 0 && <td className="text-ink-soft">{m.branch?.name ?? '—'}</td>}
                      <td className="text-ink-soft">{m.supplier?.name ?? '—'}</td>
                      <td className="text-ink-soft">{m.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
