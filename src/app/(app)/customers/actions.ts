'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { requireEdit } from '@/lib/session';
import * as v from '@/lib/validate';

const schema = z.object({
  id: z.string().optional(),
  name: v.personName,
  phone: v.phone,
  email: v.email,
  gender: z.string().nullish().refine((g): g is string => !!g && ['Female', 'Male', 'Other'].includes(g), 'choose a gender'),
  birthday: v.optional(10),
  address: v.optional(300),
  notes: v.optional(1000),
  hairNotes: v.optional(1000),
  nailNotes: v.optional(1000),
  preferredStaffId: v.optional(40),
  branchId: v.optional(40),
});
export type CustomerInput = z.input<typeof schema>;

export async function saveCustomer(input: CustomerInput) {
  return attempt(async () => {
    await requireEdit('customers');
    const { id, ...data } = schema.parse(input);
    const c = id ? await db.customer.update({ where: { id }, data }) : await db.customer.create({ data });
    revalidatePath('/customers');
    return { id: c.id, name: c.name, phone: c.phone };
  });
}

export async function archiveCustomer(id: string) {
  return attempt(async () => {
    await requireEdit('customers');
    await db.customer.update({ where: { id }, data: { active: false } });
    revalidatePath('/customers');
  });
}
