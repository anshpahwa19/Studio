import { call, type DataOf } from '@/lib/api-client';
import type * as s from './service';
export type { ExpenseInput } from './service';

export const saveExpense = (i: s.ExpenseInput) => call(i.id ? 'PUT' : 'POST', i.id ? `/expenses/${i.id}` : '/expenses', i);
export const deleteExpense = (id: string) => call('DELETE', `/expenses/${id}`);
