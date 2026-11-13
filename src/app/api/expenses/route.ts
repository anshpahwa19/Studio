import { route } from '@/app/api/_lib/handler';
import * as expenses from '@/server/features/expenses/service';
import * as expensesReads from '@/server/features/expenses/queries';

export const dynamic = 'force-dynamic';

export const GET = route(({ q }) => expensesReads.listExpenses(q));
export const POST = route(({ b }) => expenses.saveExpense(b));
