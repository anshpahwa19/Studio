import 'server-only';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { attempt } from '@/server/api/attempt';
import { ActionError, requireEdit, requireView } from '@/server/auth/session';
import { branchQty, resolveBranch } from '@/server/features/inventory/stock';
import { isoDate, parseDate } from '@/lib/format';
import * as v from '@/lib/validate';

const productSchema = z.object({
  id: z.string().optional(),
  name: v.required(120),
  sku: v.optional(40),
  category: v.required(60),
  supplierId: v.optional(40),
  costPrice: v.money.refine((n) => n > 0, 'enter the cost price first'),
  price: v.money.refine((n) => n > 0, 'enter the selling price'),
  reorderLevel: z.coerce.number().int().min(0).max(100000),
  unit: v.required(10),
  openingStock: z.coerce.number().int().min(0).max(100000).optional(),
  openingBranchId: v.optional(40),
});
export type ProductInput = z.input<typeof productSchema>;
const checkedProduct = productSchema.refine((p) => p.price >= p.costPrice, { path: ['price'], message: 'cannot be lower than the cost price' });

/** Turns the stock helper's errors into messages for the form. */
async function pickBranch(tx: Parameters<typeof resolveBranch>[0], id: string | null | undefined) {
  try { return await resolveBranch(tx, id); } catch (e) {
    if (e instanceof Error && e.message === 'BRANCH_REQUIRED') throw new ActionError('Choose which branch this stock is for.');
    if (e instanceof Error && e.message === 'BRANCH_NOT_FOUND') throw new ActionError('Branch not found.');
    throw e;
  }
}

export async function saveProduct(input: ProductInput) {
  return attempt(async () => {
    await requireEdit('inventory');
    const { id, openingStock, openingBranchId, ...data } = checkedProduct.parse(input);
    if (id) {
      await db.product.update({ where: { id }, data });
    } else {
      await db.$transaction(async (tx) => {
        const branchId = openingStock ? await pickBranch(tx, openingBranchId) : null;
        const p = await tx.product.create({ data: { ...data, stock: openingStock ?? 0 } });
        if (openingStock) await tx.stockMovement.create({ data: { productId: p.id, type: 'IN', change: openingStock, balance: openingStock, note: 'Opening stock', branchId } });
      });
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

/** Deletes a product. One that already appears on a bill is archived instead, so old bills stay intact. */
export async function deleteProduct(id: string) {
  return attempt(async () => {
    await requireEdit('inventory');
    const onBills = await db.invoiceItem.count({ where: { productId: id } });
    if (onBills) {
      await db.product.update({ where: { id }, data: { active: false } });
      revalidatePath('/inventory');
      return { archived: true };
    }
    await db.$transaction([db.stockMovement.deleteMany({ where: { productId: id } }), db.product.delete({ where: { id } })]);
    revalidatePath('/inventory');
    return { archived: false };
  });
}

const moveSchema = z.object({
  productId: v.id,
  branchId: v.optional(40),
  type: z.enum(['IN', 'OUT', 'ADJUST']),
  qty: z.coerce.number().int().min(0).max(100000),
  note: v.optional(200),
  supplierId: v.optional(40), // who it came from, for received stock
  date: v.date.optional(), // the day the stock changed; defaults to today
});

/** Today keeps the real time; an earlier day is stamped at noon so it lands in the right month. */
function whenOf(date?: string) {
  const today = isoDate();
  if (date && date > today) throw new ActionError('The date cannot be in the future.');
  return !date || date === today ? new Date() : new Date(parseDate(date).getTime() + 12 * 3600_000);
}

export async function moveStock(input: z.input<typeof moveSchema>) {
  return attempt(async () => {
    await requireEdit('inventory');
    const d = moveSchema.parse(input);
    const when = whenOf(d.date);
    await db.$transaction(async (tx) => {
      const p = await tx.product.findUnique({ where: { id: d.productId } });
      if (!p) throw new ActionError('Product not found.');
      const branchId = await pickBranch(tx, d.branchId);
      const here = await branchQty(tx, p.id, branchId);
      const where = branchId ? ' at this branch' : '';
      const change = d.type === 'IN' ? d.qty : d.type === 'OUT' ? -d.qty : d.qty - here;
      if (d.type !== 'ADJUST' && d.qty === 0) throw new ActionError('Enter a quantity above zero.');
      if (here + change < 0) throw new ActionError(`Only ${here} ${p.unit} in stock${where}.`);
      if (change === 0) throw new ActionError(`The count matches the current stock${where}. Nothing to change.`);
      if (d.type === 'IN' && d.supplierId && !(await tx.supplier.findUnique({ where: { id: d.supplierId } }))) throw new ActionError('Supplier not found.');
      await tx.product.update({ where: { id: p.id }, data: { stock: { increment: change } } });
      await tx.stockMovement.create({ data: { productId: p.id, type: d.type, change, balance: here + change, note: d.note, createdAt: when, branchId, supplierId: d.type === 'IN' ? d.supplierId : null } });
    });
    revalidatePath('/inventory');
  });
}

const transferSchema = z.object({
  productId: v.id,
  fromBranchId: v.id,
  toBranchId: v.id,
  qty: z.coerce.number().int().min(1, 'enter a quantity above zero').max(100000),
  note: v.optional(200),
  date: v.date.optional(),
});

/** Moves stock from one branch to another. The product's total does not change. */
export async function transferStock(input: z.input<typeof transferSchema>) {
  return attempt(async () => {
    await requireEdit('inventory');
    const d = transferSchema.parse(input);
    if (d.fromBranchId === d.toBranchId) throw new ActionError('Choose two different branches.');
    const when = whenOf(d.date);
    await db.$transaction(async (tx) => {
      const [p, from, to] = await Promise.all([
        tx.product.findUnique({ where: { id: d.productId } }),
        tx.branch.findUnique({ where: { id: d.fromBranchId } }),
        tx.branch.findUnique({ where: { id: d.toBranchId } }),
      ]);
      if (!p || !from || !to) throw new ActionError('Product or branch not found.');
      const fromQty = await branchQty(tx, p.id, from.id);
      if (d.qty > fromQty) throw new ActionError(`Only ${fromQty} ${p.unit} at ${from.name}.`);
      const toQty = await branchQty(tx, p.id, to.id);
      const note = (extra: string) => [extra, d.note].filter(Boolean).join(' · ');
      await tx.stockMovement.create({ data: { productId: p.id, type: 'TRANSFER', change: -d.qty, balance: fromQty - d.qty, branchId: from.id, note: note(`Sent to ${to.name}`), createdAt: when } });
      await tx.stockMovement.create({ data: { productId: p.id, type: 'TRANSFER', change: d.qty, balance: toQty + d.qty, branchId: to.id, note: note(`Received from ${from.name}`), createdAt: when } });
    });
    revalidatePath('/inventory');
  });
}

export async function stockHistory(productId: string) {
  return attempt(async () => {
    await requireView('inventory');
    return db.stockMovement.findMany({ where: { productId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50, include: { supplier: { select: { name: true } }, branch: { select: { name: true } } } });
  });
}
