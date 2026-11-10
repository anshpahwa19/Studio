import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { fmtDate, isoDate, monthEnd, money0 } from '@/lib/format';
import { Card, PageHeader } from '@/components/ui';
import { ExpenseList } from './expense-list';

const DEFAULT_CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Product restock', 'Laundry', 'Marketing', 'Refreshments', 'Maintenance'];

export default async function ExpensesPage({ searchParams }: { searchParams: { month?: string; new?: string } }) {
  await requirePage('expenses');
  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? '') ? searchParams.month! : isoDate().slice(0, 7);
  const from = `${month}-01`;
  const to = monthEnd(from);
  const [expenses, branches, used] = await Promise.all([
    db.expense.findMany({ where: { date: { gte: from, lte: to } }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], include: { branch: { select: { name: true } } } }),
    db.branch.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.expense.findMany({ distinct: ['category'], select: { category: true } }),
  ]);
  const byCategory = Object.entries(expenses.reduce<Record<string, number>>((a, e) => ({ ...a, [e.category]: (a[e.category] ?? 0) + e.amount }), {})).sort((a, b) => b[1] - a[1]);
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...used.map((u) => u.category)])].sort();

  return (
    <>
      <PageHeader title="Business Expenses" subtitle={`${fmtDate(from, { month: 'long', year: 'numeric' })} · ${money0(total)} spent`} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_280px]">
        <ExpenseList autoOpen={searchParams.new === '1'} month={month} expenses={expenses} categories={categories} branches={branches} />
        <Card title="By category">
          {byCategory.length === 0 ? <p className="text-ink-mute">Nothing recorded this month.</p> : (
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
    </>
  );
}
