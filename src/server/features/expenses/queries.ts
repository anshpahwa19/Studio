import 'server-only';
import { db } from '@/server/db';
import { ActionError } from '@/server/auth/session';
import { isoDate, monthEnd, round2 } from '@/lib/format';
import { read, str, isDate, sum, type Q } from '@/server/api/helpers';

export const listExpenses = (q: Q) =>
  read('expenses', async () => {
    const from = isDate(str(q, 'from')) ? str(q, 'from')! : `${isoDate().slice(0, 7)}-01`;
    const to = isDate(str(q, 'to')) ? str(q, 'to')! : monthEnd(from);
    const items = await db.expense.findMany({
      where: { date: { gte: from, lte: to }, ...(str(q, 'branch') && { branchId: str(q, 'branch') }), ...(str(q, 'category') && { category: str(q, 'category') }) },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], include: { branch: { select: { name: true } } },
    });
    // Totals for every branch in this period, whichever branch is being viewed.
    const perBranch = await db.expense.groupBy({ by: ['branchId'], where: { date: { gte: from, lte: to } }, _sum: { amount: true }, _count: true });
    return { from, to, total: round2(sum(items.map((e) => e.amount))), byBranch: perBranch.map((r) => ({ branchId: r.branchId, total: round2(r._sum.amount ?? 0), count: r._count })), items };
  });

export const getExpense = (id: string) =>
  read('expenses', async () => {
    const x = await db.expense.findUnique({ where: { id }, include: { branch: { select: { name: true } } } });
    if (!x) throw new ActionError('Expense not found.', 404);
    return x;
  });

export const expenseCategories = () => read('expenses', async () => (await db.expense.findMany({ distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } })).map((c) => c.category));
