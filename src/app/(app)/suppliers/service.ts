import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { requireEdit } from '@/lib/session';
import * as v from '@/lib/validate';

const schema = z.object({
  id: z.string().optional(),
  name: v.required(120),
  contact: v.optional(100),
  phone: v.optionalPhone,
  email: v.email,
  address: v.optional(300),
  gstin: v.optionalGstin,
  notes: v.optional(500),
});
export type SupplierInput = z.input<typeof schema>;

export async function saveSupplier(input: SupplierInput) {
  return attempt(async () => {
    await requireEdit('suppliers');
    const { id, ...data } = schema.parse(input);
    if (id) await db.supplier.update({ where: { id }, data });
    else await db.supplier.create({ data });
    revalidatePath('/suppliers');
    revalidatePath('/inventory');
  });
}

export async function setSupplierActive(id: string, active: boolean) {
  return attempt(async () => {
    await requireEdit('suppliers');
    await db.supplier.update({ where: { id }, data: { active } });
    revalidatePath('/suppliers');
    revalidatePath('/inventory');
  });
}
