import { route } from '@/app/api/_lib/handler';
import * as expensesReads from '@/server/features/expenses/queries';

export const dynamic = 'force-dynamic';

export const GET = route(() => expensesReads.expenseCategories());
