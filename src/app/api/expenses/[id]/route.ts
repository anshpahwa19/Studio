import { route } from '@/app/api/_lib/handler';
import * as expenses from '@/server/features/expenses/service';
import * as expensesReads from '@/server/features/expenses/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ p }) => expensesReads.getExpense(p.id));
export const PUT = route(({ p, b }) => expenses.saveExpense({ ...b, id: p.id }));
export const DELETE = route(({ p }) => expenses.deleteExpense(p.id));
