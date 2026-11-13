import { call, type DataOf } from '@/client/api/call';
import type * as s from '@/server/features/expenses/service';
export type { ExpenseInput } from '@/server/features/expenses/service';

export const saveExpense = (i: s.ExpenseInput) => call(i.id ? 'PUT' : 'POST', i.id ? `/expenses/${i.id}` : '/expenses', i);
export const deleteExpense = (id: string) => call('DELETE', `/expenses/${id}`);
