// Supplier bills: how much is still owed and what to call the bill.
import { round2 } from './format';

export const dueOf = (b: { amount: number; paid: number }) => Math.max(0, round2(b.amount - b.paid));

export function billStatus(b: { amount: number; paid: number }): 'Paid' | 'Partial' | 'Unpaid' {
  if (dueOf(b) <= 0) return 'Paid';
  return b.paid > 0 ? 'Partial' : 'Unpaid';
}
