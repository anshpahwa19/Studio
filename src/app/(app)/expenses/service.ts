import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { requireEdit } from '@/lib/session';
import * as v from '@/lib/validate';

const schema = z.object({
  id: z.string().optional(),
  date: v.date,
  category: v.required(60),
  description: v.required(200),
  amount: z.coerce.number().positive('must be above zero').max(10_000_000),
  method: z.enum(v.PAYMENT_METHODS),
  vendor: v.optional(120),
  branchId: v.optional(40),
});
export type ExpenseInput = z.input<typeof schema>;

export async function saveExpense(input: ExpenseInput) {
  return attempt(async () => {
    await requireEdit('expenses');
    const { id, ...data } = schema.parse(input);
    if (id) await db.expense.update({ where: { id }, data });
    else await db.expense.create({ data });
    revalidatePath('/expenses');
  });
}

export async function deleteExpense(id: string) {
  return attempt(async () => {
    await requireEdit('expenses');
    await db.expense.delete({ where: { id } });
    revalidatePath('/expenses');
  });
}
