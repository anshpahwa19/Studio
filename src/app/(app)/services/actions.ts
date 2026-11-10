'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { requireEdit } from '@/lib/session';
import * as v from '@/lib/validate';

const serviceSchema = z.object({
  id: z.string().optional(),
  name: v.required(120),
  categoryId: v.id,
  price: v.money,
  duration: z.coerce.number().int().min(5, 'must be at least 5 minutes').max(600),
  taxRate: v.taxRate,
  description: v.optional(500),
});
export type ServiceInput = z.input<typeof serviceSchema>;

export async function saveService(input: ServiceInput) {
  return attempt(async () => {
    await requireEdit('services');
    const { id, ...data } = serviceSchema.parse(input);
    if (id) await db.service.update({ where: { id }, data });
    else await db.service.create({ data });
    revalidatePath('/services');
  });
}

export async function archiveService(id: string) {
  return attempt(async () => {
    await requireEdit('services');
    await db.service.update({ where: { id }, data: { active: false } });
    revalidatePath('/services');
  });
}

export async function addCategory(name: string) {
  return attempt(async () => {
    await requireEdit('services');
    const n = v.required(60).parse(name);
    const last = await db.serviceCategory.aggregate({ _max: { sortOrder: true } });
    await db.serviceCategory.create({ data: { name: n, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    revalidatePath('/services');
  });
}
