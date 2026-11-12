import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from './db';

type Tx = Prisma.TransactionClient;

/** How many of a product sit on one branch's shelf (null = stock not tied to a branch). */
export async function branchQty(tx: Tx, productId: string, branchId: string | null) {
  const r = await tx.stockMovement.aggregate({ where: { productId, branchId }, _sum: { change: true } });
  return r._sum.change ?? 0;
}

/** productId -> branchId -> count, built from the movement history. */
export async function stockByBranch(productIds?: string[]) {
  const rows = await db.stockMovement.groupBy({
    by: ['productId', 'branchId'],
    where: productIds ? { productId: { in: productIds } } : {},
    _sum: { change: true },
  });
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = out.get(r.productId) ?? new Map<string, number>();
    m.set(r.branchId ?? '', (m.get(r.branchId ?? '') ?? 0) + (r._sum.change ?? 0));
    out.set(r.productId, m);
  }
  return out;
}

/** The branch a stock change belongs to. With branches set up one must be chosen. */
export async function resolveBranch(tx: Tx, id: string | null | undefined) {
  if (id) {
    const b = await tx.branch.findUnique({ where: { id }, select: { id: true } });
    if (!b) throw new Error('BRANCH_NOT_FOUND');
    return b.id;
  }
  if (await tx.branch.count()) throw new Error('BRANCH_REQUIRED');
  return null;
}
