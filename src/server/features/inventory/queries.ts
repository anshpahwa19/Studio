import 'server-only';
import { db } from '@/server/db';
import { ActionError } from '@/server/auth/session';
import { isoDate, parseDate, round2 } from '@/lib/format';
import { stockByBranch } from '@/server/features/inventory/stock';
import { read, page, str, isDate, sum, type Q } from '@/server/api/helpers';

export const listProducts = (q: Q) =>
  read('inventory', async () => {
    const term = str(q, 'q');
    const branch = str(q, 'branch');
    const rows = await db.product.findMany({
      where: { active: q.get('archived') === '1' ? false : true, ...(term && { OR: [{ name: { contains: term } }, { sku: { contains: term } }, { category: { contains: term } }] }) },
      orderBy: { name: 'asc' }, include: { supplierRef: { select: { name: true } } },
    });
    const shelves = await stockByBranch(rows.map((p) => p.id));
    let items = rows.map(({ supplierRef, ...p }) => {
      const byBranch = Object.fromEntries(shelves.get(p.id) ?? []);
      return { ...p, supplierName: supplierRef?.name ?? null, byBranch, stock: branch ? byBranch[branch] ?? 0 : p.stock };
    });
    if (q.get('low') === '1') items = items.filter((p) => p.stock <= p.reorderLevel);
    return { total: items.length, stockValue: round2(sum(items.map((p) => p.stock * p.costPrice))), items };
  });

export const listStockMovements = (q: Q) =>
  read('inventory', async () => {
    const from = str(q, 'from'), to = str(q, 'to');
    return db.stockMovement.findMany({
      where: {
        ...(str(q, 'productId') && { productId: str(q, 'productId') }),
        ...(str(q, 'branch') && { branchId: str(q, 'branch') }),
        ...(str(q, 'type') && { type: str(q, 'type') }),
        ...((isDate(from) || isDate(to)) && { createdAt: { ...(isDate(from) && { gte: new Date(`${from}T00:00:00`) }), ...(isDate(to) && { lte: new Date(`${to}T23:59:59.999`) }) } }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...page(q),
      include: { product: { select: { name: true, unit: true } }, supplier: { select: { name: true } }, branch: { select: { name: true } } },
    });
  });

export const getProduct = (id: string) =>
  read('inventory', async () => {
    const p = await db.product.findUnique({ where: { id }, include: { supplierRef: { select: { name: true } } } });
    if (!p) throw new ActionError('Product not found.', 404);
    const { supplierRef, ...rest } = p;
    return { ...rest, supplierName: supplierRef?.name ?? null, byBranch: Object.fromEntries((await stockByBranch([id])).get(id) ?? []) };
  });

/** One month of stock per product: opening count, received, sold, used, corrections, transfers and closing count. */
export const monthlyStock = (q: Q) =>
  read('inventory', async () => {
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(str(q, 'month') ?? '') ? str(q, 'month')! : isoDate().slice(0, 7);
    const branch = str(q, 'branch');
    const inBranch = branch ? { branchId: branch } : {};
    const from = parseDate(`${month}-01`);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    const [products, before, during, received] = await Promise.all([
      db.product.findMany({ orderBy: { name: 'asc' } }),
      db.stockMovement.groupBy({ by: ['productId'], where: { createdAt: { lt: from }, ...inBranch }, _sum: { change: true } }),
      db.stockMovement.groupBy({ by: ['productId', 'type'], where: { createdAt: { gte: from, lt: to }, ...inBranch }, _sum: { change: true } }),
      db.stockMovement.findMany({ where: { type: 'IN', createdAt: { gte: from, lt: to }, ...inBranch }, orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true, unit: true } }, supplier: { select: { name: true } }, branch: { select: { name: true } } } }),
    ]);
    const opening = new Map(before.map((b) => [b.productId, b._sum.change ?? 0]));
    const total = (id: string, ...types: string[]) => sum(during.filter((m) => m.productId === id && types.includes(m.type)).map((m) => m._sum.change ?? 0));
    const items = products
      .map((p) => {
        const open = opening.get(p.id) ?? 0;
        const inn = total(p.id, 'IN'), sold = total(p.id, 'SALE', 'RETURN'), used = total(p.id, 'OUT'), corrections = total(p.id, 'ADJUST'), transfers = total(p.id, 'TRANSFER');
        return { productId: p.id, name: p.name, category: p.category, unit: p.unit, active: p.active, opening: open, received: inn, sold: -sold, used: -used, corrections, transfers, closing: open + inn + sold + used + corrections + transfers };
      })
      .filter((r) => r.active || r.opening || r.received || r.sold || r.used || r.corrections || r.transfers);
    return { month, branch: branch ?? null, items, receipts: received };
  });
