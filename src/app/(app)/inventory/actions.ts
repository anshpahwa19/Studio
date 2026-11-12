'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { ActionError, requireEdit, requirePage } from '@/lib/session';
import { isoDate, parseDate } from '@/lib/format';
import * as v from '@/lib/validate';

const productSchema = z.object({
  id: z.string().optional(),
  name: v.required(120),
  sku: v.optional(40),
  category: v.required(60),
  supplier: v.optional(120),
  costPrice: v.money,
  price: v.money,
  reorderLevel: z.coerce.number().int().min(0).max(100000),
  unit: v.required(10),
  openingStock: z.coerce.number().int().min(0).max(100000).optional(),
});
export type ProductInput = z.input<typeof productSchema>;

export async function saveProduct(input: ProductInput) {
  return attempt(async () => {
    await requireEdit('inventory');
    const { id, openingStock, ...data } = productSchema.parse(input);
    if (id) {
      await db.product.update({ where: { id }, data });
    } else {
      const p = await db.product.create({ data: { ...data, stock: openingStock ?? 0 } });
      if (openingStock) await db.stockMovement.create({ data: { productId: p.id, type: 'IN', change: openingStock, balance: openingStock, note: 'Opening stock' } });
    }
    revalidatePath('/inventory');
  });
}

export async function archiveProduct(id: string) {
  return attempt(async () => {
    await requireEdit('inventory');
    await db.product.update({ where: { id }, data: { active: false } });
    revalidatePath('/inventory');
  });
}

const moveSchema = z.object({
  productId: v.id,
  type: z.enum(['IN', 'OUT', 'ADJUST']),
  qty: z.coerce.number().int().min(0).max(100000),
  note: v.optional(200),
  date: v.date.optional(), // the day the stock changed; defaults to today
});

export async function moveStock(input: z.input<typeof moveSchema>) {
  return attempt(async () => {
    await requireEdit('inventory');
    const d = moveSchema.parse(input);
    const today = isoDate();
    if (d.date && d.date > today) throw new ActionError('The date cannot be in the future.');
    // Today keeps the real time; an earlier day is stamped at noon so it lands in the right month.
    const when = !d.date || d.date === today ? new Date() : new Date(parseDate(d.date).getTime() + 12 * 3600_000);
    await db.$transaction(async (tx) => {
      const p = await tx.product.findUnique({ where: { id: d.productId } });
      if (!p) throw new ActionError('Product not found.');
      const change = d.type === 'IN' ? d.qty : d.type === 'OUT' ? -d.qty : d.qty - p.stock;
      if (d.type !== 'ADJUST' && d.qty === 0) throw new ActionError('Enter a quantity above zero.');
      if (p.stock + change < 0) throw new ActionError(`Only ${p.stock} ${p.unit} in stock.`);
      if (change === 0) throw new ActionError('The count matches the current stock. Nothing to change.');
      const updated = await tx.product.update({ where: { id: p.id }, data: { stock: { increment: change } } });
      await tx.stockMovement.create({ data: { productId: p.id, type: d.type, change, balance: updated.stock, note: d.note, createdAt: when } });
    });
    revalidatePath('/inventory');
  });
}

export async function stockHistory(productId: string) {
  await requirePage('inventory');
  return db.stockMovement.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: 50 });
}
