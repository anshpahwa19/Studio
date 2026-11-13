import { api } from '@/lib/api-server';
import type { expenseCategories, listBranches, listExpenses } from '@/lib/api-reads';
import type { DataOf } from '@/lib/api-client';
import { requirePage } from '@/lib/session';
import { fmtDate, isoDate, monthEnd, money0 } from '@/lib/format';
import { Card, PageHeader } from '@/components/ui';
import { ExpenseList } from './expense-list';

const DEFAULT_CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Product restock', 'Laundry', 'Marketing', 'Refreshments', 'Maintenance'];

export default async function ExpensesPage({ searchParams }: { searchParams: { from?: string; to?: string; new?: string; branch?: string } }) {
  await requirePage('expenses');
  const isDate = (d?: string) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '');
  // Defaults to the current month; any from and to dates can be chosen.
  let from = isDate(searchParams.from) ? searchParams.from! : `${isoDate().slice(0, 7)}-01`;
  let to = isDate(searchParams.to) ? searchParams.to! : monthEnd(from);
  if (to < from) [from, to] = [to, from];
  const isMonth = from.endsWith('-01') && to === monthEnd(from);
  const periodLabel = isMonth ? fmtDate(from, { month: 'long', year: 'numeric' }) : from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`;
  const allBranches = (await api<DataOf<typeof listBranches>>('/branches')).map((b) => ({ id: b.id, name: b.name, active: b.active }));
  const branch = allBranches.some((b) => b.id === searchParams.branch) ? searchParams.branch! : '';
  const [{ items: expenses, byBranch: monthAll }, used] = await Promise.all([
    api<DataOf<typeof listExpenses>>('/expenses', { from, to, branch }),
    api<DataOf<typeof expenseCategories>>('/expenses/categories'),
  ]);
  const branches = allBranches.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }));
  const perBranch = [...allBranches.map((b) => ({ id: b.id as string | null, name: b.name })), { id: null, name: 'Whole business' }]
    .map((b) => ({ ...b, total: monthAll.find((m) => m.branchId === b.id)?.total ?? 0, count: monthAll.find((m) => m.branchId === b.id)?.count ?? 0 }))
    .filter((b) => b.id !== null || b.count > 0);
  const grand = perBranch.reduce((a, b) => a + b.total, 0);
  const byCategory = Object.entries(expenses.reduce<Record<string, number>>((a, e) => ({ ...a, [e.category]: (a[e.category] ?? 0) + e.amount }), {})).sort((a, b) => b[1] - a[1]);
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...used])].sort();

  return (
    <>
      <PageHeader title="Business Expenses" subtitle={`${periodLabel} · ${money0(total)} spent · ${allBranches.find((b) => b.id === branch)?.name ?? 'All branches'}`} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_280px]">
        <ExpenseList autoOpen={searchParams.new === '1'} from={from} to={to} branch={branch} allBranches={allBranches.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }))} expenses={expenses} categories={categories} branches={branches} />
        <div className="space-y-6">
        {allBranches.length > 0 && (
          <Card title="By branch" subtitle="This period, all branches">
            <ul className="space-y-3">
              {perBranch.map((b) => (
                <li key={b.id ?? 'none'}>
                  <div className="flex justify-between text-[13px]"><span>{b.name}</span><span className="tabular font-medium">{money0(b.total)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-canvas"><div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${grand ? (b.total / grand) * 100 : 0}%` }} /></div>
                </li>
              ))}
              <li className="flex justify-between border-t border-line pt-3 text-[13px] font-semibold"><span>All branches</span><span className="tabular">{money0(grand)}</span></li>
            </ul>
          </Card>
        )}
        <Card title="By category">
          {byCategory.length === 0 ? <p className="text-ink-mute">Nothing recorded in this period.</p> : (
            <ul className="space-y-3">
              {byCategory.map(([c, amt]) => (
                <li key={c}>
                  <div className="flex justify-between text-[13px]"><span>{c}</span><span className="tabular font-medium">{money0(amt)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-canvas"><div className="h-1.5 rounded-full bg-plum-500" style={{ width: `${(amt / total) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        </div>
      </div>
    </>
  );
}
