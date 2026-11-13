import 'server-only';
import { db } from '@/server/db';
import { addDays, isoDate, parseDate, round2 } from '@/lib/format';
import { range, resolvePeriod } from '@/lib/period';
import { read, str, sum, type Q } from '@/server/api/helpers';

export const report = (q: Q) =>
  read('reports', async () => {
    const { key, from, to } = resolvePeriod({ period: str(q, 'period'), from: str(q, 'from'), to: str(q, 'to') });
    const when = range(from, to);
    const branch = str(q, 'branch');
    const inBranch = branch ? { branchId: branch } : {};
    const [invoices, payments, refunds, expenses, staff, branches] = await Promise.all([
      db.invoice.findMany({ where: { createdAt: when, status: { not: 'Cancelled' }, ...inBranch }, include: { items: true } }),
      db.payment.findMany({ where: { createdAt: when, invoice: { status: { not: 'Cancelled' }, ...inBranch } }, include: { invoice: { select: { branchId: true } } } }),
      db.refund.findMany({ where: { createdAt: when, invoice: { status: { not: 'Cancelled' }, ...inBranch } }, include: { invoice: { select: { branchId: true } } } }),
      db.expense.findMany({ where: { date: { gte: from, lte: to }, ...inBranch } }),
      db.staff.findMany({ select: { id: true, name: true, payType: true, commissionRate: true } }),
      db.branch.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ]);
    // Side by side figures per branch, when all branches are combined.
    const compare = branch ? [] : [...branches.map((b) => ({ id: b.id as string | null, name: b.name })), { id: null, name: 'Not assigned to a branch' }].map((b) => {
      const inv = invoices.filter((i) => i.branchId === b.id);
      const net = sum(inv.map((i) => i.total - i.tax));
      const spentHere = sum(expenses.filter((e) => e.branchId === b.id).map((e) => e.amount));
      const collected = sum(payments.filter((p) => p.invoice.branchId === b.id).map((p) => p.amount)) - sum(refunds.filter((r) => r.invoice.branchId === b.id).map((r) => r.amount));
      return { branchId: b.id, name: b.name, bills: inv.length, netSales: round2(net), expenses: round2(spentHere), profit: round2(net - spentHere), collected: round2(collected) };
    }).filter((r) => r.branchId !== null || r.bills || r.expenses || r.collected);
    const group = <T>(rows: T[], key: (r: T) => string, val: (r: T) => { qty: number; value: number }) => {
      const m = new Map<string, { key: string; qty: number; value: number }>();
      for (const r of rows) { const k = key(r); const v = val(r); const cur = m.get(k) ?? { key: k, qty: 0, value: 0 }; cur.qty += v.qty; cur.value += v.value; m.set(k, cur); }
      return [...m.values()].map((r) => ({ ...r, value: round2(r.value) })).sort((a, b) => b.value - a.value);
    };
    const sales = sum(invoices.map((i) => i.total));
    const tax = sum(invoices.map((i) => i.tax));
    const spent = sum(expenses.map((e) => e.amount));
    const items = invoices.flatMap((i) => i.items);
    const days = Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000) + 1;
    const byMonth = days > 62;
    // Every day (or month) in the range gets a point, even with no sales.
    const series = new Map<string, number>();
    if (byMonth) { for (let d = from; d <= to; d = addDays(d, 28)) series.set(d.slice(0, 7), 0); series.set(to.slice(0, 7), series.get(to.slice(0, 7)) ?? 0); }
    else for (let n = 0; n < days; n++) series.set(addDays(from, n), 0);
    for (const i of invoices) { const k = byMonth ? isoDate(i.createdAt).slice(0, 7) : isoDate(i.createdAt); series.set(k, (series.get(k) ?? 0) + i.total - i.tax); }
    const staffById = new Map(staff.map((s) => [s.id, s]));
    return {
      period: key, from, to, branch: branch ?? null,
      sales: round2(sales), tax: round2(tax), netSales: round2(sales - tax), bills: invoices.length,
      collected: round2(sum(payments.map((p) => p.amount)) - sum(refunds.map((r) => r.amount))),
      dues: round2(sum(invoices.map((i) => i.total - i.paid))), discounts: round2(sum(invoices.map((i) => i.discount))),
      expenses: round2(spent), expenseCount: expenses.length, profit: round2(sales - tax - spent),
      salesBy: byMonth ? 'month' : 'day',
      salesSeries: [...series].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value: round2(value) })),
      topServices: group(items.filter((i) => i.kind === 'service'), (i) => i.name, (i) => ({ qty: i.qty, value: i.total - i.tax })).slice(0, 8),
      topProducts: group(items.filter((i) => i.kind === 'product'), (i) => i.name, (i) => ({ qty: i.qty, value: i.total - i.tax })).slice(0, 8),
      paymentMethods: group([...payments, ...refunds.map((r) => ({ ...r, amount: -r.amount }))], (p) => p.method, (p) => ({ qty: 1, value: p.amount })),
      expenseCategories: group(expenses, (e) => e.category, (e) => ({ qty: 1, value: e.amount })),
      branchComparison: compare,
      staffPerformance: group(items.filter((i) => i.kind === 'service' && i.staffId), (i) => i.staffId!, (i) => ({ qty: i.qty, value: i.total - i.tax }))
        .map(({ key: id, ...r }) => ({ staffId: id, name: staffById.get(id)?.name ?? 'Former staff', commissionRate: staffById.get(id)?.commissionRate ?? 0, salaried: staffById.get(id)?.payType === 'Salary', ...r })),
    };
  });
