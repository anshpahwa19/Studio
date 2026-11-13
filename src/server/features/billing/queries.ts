import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { ActionError } from '@/server/auth/session';
import { round2 } from '@/lib/format';
import { read, page, str, isDate, type Q } from '@/server/api/helpers';

export const listInvoices = (q: Q) =>
  read('billing', async () => {
    const where: Prisma.InvoiceWhereInput = {};
    if (str(q, 'status')) where.status = str(q, 'status');
    if (str(q, 'branch')) where.branchId = str(q, 'branch');
    if (str(q, 'customerId')) where.customerId = str(q, 'customerId');
    const from = str(q, 'from'), to = str(q, 'to');
    if (isDate(from) || isDate(to)) where.createdAt = { ...(isDate(from) && { gte: new Date(`${from}T00:00:00`) }), ...(isDate(to) && { lte: new Date(`${to}T23:59:59.999`) }) };
    const term = str(q, 'q');
    if (term) where.OR = [{ number: { contains: term } }, { customer: { name: { contains: term } } }, { customer: { phone: { contains: term } } }];
    // ?sort= number | client | date | branch | total | due | status, with ?dir=asc|desc. Newest first by default.
    const SORTS = ['number', 'client', 'date', 'branch', 'total', 'due', 'status'];
    const sort = SORTS.includes(q.get('sort') ?? '') ? q.get('sort')! : 'date';
    const dir: 'asc' | 'desc' = q.get('dir') === 'asc' ? 'asc' : q.get('dir') === 'desc' ? 'desc' : 'desc';
    const orderBy: Prisma.InvoiceOrderByWithRelationInput[] = [
      sort === 'number' ? { number: dir } : sort === 'client' ? { customer: { name: dir } } : sort === 'branch' ? { branch: { name: dir } } : sort === 'total' ? { total: dir } : sort === 'status' ? { status: dir } : { createdAt: sort === 'date' ? dir : 'desc' },
      { createdAt: 'desc' },
    ];
    const [total, rows, totals, dues] = await Promise.all([
      db.invoice.count({ where }),
      db.invoice.findMany({ where, orderBy, ...page(q), include: { customer: { select: { id: true, name: true, phone: true } }, branch: { select: { name: true } }, _count: { select: { items: true } } } }),
      db.invoice.aggregate({ where: { ...where, status: str(q, 'status') ?? { not: 'Cancelled' } }, _sum: { total: true, paid: true }, _count: true }),
      db.invoice.aggregate({ where: { status: { in: ['Unpaid', 'Partial'] } }, _sum: { total: true, paid: true }, _count: true }),
    ]);
    const dueOf = (i: { status: string; total: number; paid: number }) => (i.status === 'Cancelled' ? 0 : i.total - i.paid);
    const items = sort === 'due' ? [...rows].sort((a, b) => (dir === 'asc' ? 1 : -1) * (dueOf(a) - dueOf(b))) : rows;
    return {
      total, billed: round2(totals._sum.total ?? 0), collected: round2(totals._sum.paid ?? 0), counted: totals._count,
      outstanding: round2((dues._sum.total ?? 0) - (dues._sum.paid ?? 0)), outstandingBills: dues._count, items,
    };
  });

export const getInvoice = (id: string) =>
  read('billing', async () => {
    const i = await db.invoice.findUnique({ where: { id }, include: { customer: true, branch: true, items: { include: { staff: { select: { name: true } } } }, payments: { orderBy: { createdAt: 'asc' } }, refunds: { orderBy: { createdAt: 'asc' } } } });
    if (!i) throw new ActionError('Bill not found.', 404);
    return i;
  });
