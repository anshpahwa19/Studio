import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { attempt } from './action';
import { ActionError, currentUser, requireView, type SessionUser } from './session';
import { canView, type Area } from './roles';
import { addDays, isoDate, monthEnd, parseDate, round2, weekStart } from './format';
import { stockByBranch } from './stock';
import { range, resolvePeriod } from '@/app/(app)/reports/period';

/** Query-string values, e.g. ?q=priya&limit=50. */
type Q = URLSearchParams;
const str = (q: Q, k: string) => q.get(k)?.trim() || undefined;
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const num = (q: Q, k: string, def: number, max: number) => Math.min(Math.max(Math.floor(Number(q.get(k))) || def, 1), max);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Checks the person may see this area, then runs the query. */
const read = <T>(area: Area, fn: (user: SessionUser) => Promise<T>) =>
  attempt(async () => {
    const user = await requireView(area);
    return fn(user);
  });

/** The app has a few hundred rows of each kind, so lists are capped rather than paged. */
const page = (q: Q) => ({ take: num(q, 'limit', 100, 5000), skip: Math.max(Number(q.get('offset')) || 0, 0) });

export const me = () =>
  attempt(async () => {
    const user = await currentUser();
    if (!user) throw new ActionError('Your session has ended. Sign in again.', 401);
    return user;
  });

// ---- Clients ----
export const listCustomers = (q: Q) =>
  read('customers', async () => {
    const term = str(q, 'q');
    const branch = str(q, 'branch');
    const visitedAppt = { status: { notIn: ['Cancelled', 'NoShow'] } };
    const where: Prisma.CustomerWhereInput = {
      active: q.get('archived') === '1' ? false : true,
      ...(term && { OR: [{ name: { contains: term } }, { phone: { contains: term } }, { email: { contains: term } }] }),
      ...(branch && { OR: [{ branchId: branch }, { appointments: { some: { branchId: branch, ...visitedAppt } } }, { invoices: { some: { branchId: branch, status: { not: 'Cancelled' } } } }] }),
    };
    const [total, list] = await Promise.all([
      db.customer.count({ where }),
      db.customer.findMany({ where, orderBy: { name: 'asc' }, ...page(q), include: { preferredStaff: { select: { name: true } } } }),
    ]);
    const ids = list.map((c) => c.id);
    const [spend, visits, apptBranches, billBranches, branches] = await Promise.all([
      db.invoice.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, status: { not: 'Cancelled' } }, _sum: { total: true, paid: true } }),
      db.appointment.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, status: 'Completed' }, _count: true, _max: { date: true } }),
      db.appointment.groupBy({ by: ['customerId', 'branchId'], where: { customerId: { in: ids }, branchId: { not: null }, ...visitedAppt } }),
      db.invoice.groupBy({ by: ['customerId', 'branchId'], where: { customerId: { in: ids }, branchId: { not: null }, status: { not: 'Cancelled' } } }),
      db.branch.findMany({ select: { id: true, name: true } }),
    ]);
    const s = new Map(spend.map((r) => [r.customerId, r._sum]));
    const v = new Map(visits.map((r) => [r.customerId, r]));
    const branchName = new Map(branches.map((b) => [b.id, b.name]));
    // Branches a client has been to: their home branch, plus any branch with a visit or a bill.
    const visited = new Map<string, Set<string>>();
    for (const c of list) { const n = c.branchId && branchName.get(c.branchId); if (n) visited.set(c.id, new Set([n])); }
    for (const r of [...apptBranches, ...billBranches]) {
      const n = branchName.get(r.branchId!);
      if (n) visited.set(r.customerId, (visited.get(r.customerId) ?? new Set()).add(n));
    }
    const rows = list.map(({ preferredStaff, ...c }) => ({
      ...c,
      preferredStaffName: preferredStaff?.name ?? null,
      branchesVisited: [...(visited.get(c.id) ?? [])].sort(),
      visits: v.get(c.id)?._count ?? 0,
      lastVisit: v.get(c.id)?._max.date ?? null,
      billed: round2(s.get(c.id)?.total ?? 0),
      due: round2((s.get(c.id)?.total ?? 0) - (s.get(c.id)?.paid ?? 0)),
    }));
    // ?sort= name | stylist | branches | visits | last | billed | due, with ?dir=asc|desc. Blank values always go last.
    const SORTS = ['name', 'stylist', 'branches', 'visits', 'last', 'billed', 'due'];
    const sort = SORTS.includes(q.get('sort') ?? '') ? q.get('sort')! : 'name';
    const dir = q.get('dir') === 'desc' ? 'desc' : 'asc';
    const keyOf = (c: (typeof rows)[number]): string | number => {
      switch (sort) {
        case 'stylist': return (c.preferredStaffName ?? '').toLowerCase();
        case 'branches': return c.branchesVisited.join(', ').toLowerCase();
        case 'visits': return c.visits;
        case 'last': return c.lastVisit ?? '';
        case 'billed': return c.billed;
        case 'due': return c.due;
        default: return c.name.toLowerCase();
      }
    };
    const items = [...rows].sort((a, b) => {
      const ka = keyOf(a), kb = keyOf(b);
      if ((ka === '') !== (kb === '')) return ka === '' ? 1 : -1;
      const r = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
      return (dir === 'asc' ? r : -r) || a.name.localeCompare(b.name);
    });
    return { total, items };
  });

export const getCustomer = (id: string) =>
  read('customers', async (user) => {
    const money = canView(user.role, 'billing');
    const c = await db.customer.findUnique({ where: { id }, include: { preferredStaff: { select: { name: true } }, branch: { select: { name: true } } } });
    if (!c) throw new ActionError('Client not found.', 404);
    const [appointments, invoices] = await Promise.all([
      db.appointment.findMany({ where: { customerId: id }, orderBy: [{ date: 'desc' }, { startTime: 'desc' }], take: 50, include: { staff: { select: { name: true } }, branch: { select: { name: true } }, services: { select: { name: true, price: true } } } }),
      // Bills and amounts are only for roles that may see billing.
      !money ? [] : db.invoice.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, number: true, status: true, total: true, paid: true, refunded: true, createdAt: true, branch: { select: { name: true } } } }),
    ]);
    const [byAppt, byBill, branches] = await Promise.all([
      db.appointment.groupBy({ by: ['branchId'], where: { customerId: id, status: 'Completed', branchId: { not: null } }, _count: true, _max: { date: true } }),
      db.invoice.groupBy({ by: ['branchId'], where: { customerId: id, status: { not: 'Cancelled' }, branchId: { not: null } }, _sum: { total: true } }),
      db.branch.findMany({ select: { id: true, name: true } }),
    ]);
    const branchVisits = branches
      .map((b) => ({ branchId: b.id, name: b.name, visits: byAppt.find((x) => x.branchId === b.id)?._count ?? 0, lastVisit: byAppt.find((x) => x.branchId === b.id)?._max.date ?? null, billed: money ? round2(byBill.find((x) => x.branchId === b.id)?._sum.total ?? 0) : 0 }))
      .filter((b) => b.visits || b.billed)
      .sort((a, b) => b.billed - a.billed);
    const live = invoices.filter((i) => i.status !== 'Cancelled');
    return { ...c, appointments, invoices, branchVisits, billed: round2(sum(live.map((i) => i.total))), due: round2(sum(live.map((i) => i.total - i.paid))), visits: appointments.filter((a) => a.status === 'Completed').length };
  });

// ---- Appointments ----
export const listAppointments = (q: Q) =>
  read('appointments', async () => {
    const date = str(q, 'date');
    const from = isDate(str(q, 'from')) ? str(q, 'from')! : isDate(date) ? date! : isoDate();
    const to = isDate(str(q, 'to')) ? str(q, 'to')! : q.get('view') === 'week' ? addDays(weekStart(from), 6) : from;
    const where: Prisma.AppointmentWhereInput = {
      date: { gte: q.get('view') === 'week' ? weekStart(from) : from, lte: to },
      ...(str(q, 'staffId') && { staffId: str(q, 'staffId') }),
      ...(str(q, 'branch') && { branchId: str(q, 'branch') }),
      ...(str(q, 'customerId') && { customerId: str(q, 'customerId') }),
      ...(str(q, 'status') && { status: str(q, 'status') }),
    };
    return db.appointment.findMany({
      where, orderBy: [{ date: 'asc' }, { startTime: 'asc' }], take: 1000,
      include: { branch: { select: { name: true } }, staff: { select: { name: true } }, customer: { select: { id: true, name: true, phone: true } }, services: true, invoice: { select: { id: true, number: true, status: true } } },
    });
  });

export const getAppointment = (id: string) =>
  read('appointments', async () => {
    const a = await db.appointment.findUnique({ where: { id }, include: { branch: true, staff: { select: { id: true, name: true } }, customer: { select: { id: true, name: true, phone: true } }, services: true, invoice: { select: { id: true, number: true, status: true } } } });
    if (!a) throw new ActionError('Appointment not found.', 404);
    return a;
  });

// ---- Attendance ----
export const listAttendance = (q: Q) =>
  read('attendance', async () => {
    const month = str(q, 'month');
    const date = isDate(str(q, 'date')) ? str(q, 'date')! : isoDate();
    const from = isDate(str(q, 'from')) ? str(q, 'from')! : month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? `${month}-01` : date;
    const to = isDate(str(q, 'to')) ? str(q, 'to')! : month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? monthEnd(from) : from;
    return db.attendance.findMany({ where: { date: { gte: from, lte: to }, ...(str(q, 'staffId') && { staffId: str(q, 'staffId') }) }, orderBy: [{ date: 'asc' }, { checkIn: 'asc' }], include: { staff: { select: { name: true } } } });
  });

// ---- Bills ----
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

// ---- Stock ----
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

// ---- Services, staff ----
export const listServices = (q: Q) =>
  read('services', async () => {
    const archived = q.get('archived') === '1';
    return db.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' }, include: { services: { where: archived ? {} : { active: true }, orderBy: { name: 'asc' } } } });
  });

export const listStaff = (q: Q) =>
  read('appointments', async (user) => {
    // Stylists and receptionists need the list to book; pay details are for owners and managers only.
    const full = canView(user.role, 'staff');
    const [rows, upcoming] = await Promise.all([
      db.staff.findMany({ where: q.get('archived') === '1' ? {} : { active: true }, orderBy: { name: 'asc' } }),
      db.appointment.groupBy({ by: ['staffId'], where: { status: 'Booked', date: { gte: isoDate() } }, _count: true }),
    ]);
    const n = new Map(upcoming.map((u) => [u.staffId, u._count]));
    return rows.map((s) => (full ? { ...s, upcoming: n.get(s.id) ?? 0 } : { id: s.id, name: s.name, title: s.title, workDays: s.workDays, startTime: s.startTime, endTime: s.endTime, active: s.active, upcoming: n.get(s.id) ?? 0 }));
  });

export const getStaff = (id: string) =>
  read('staff', async () => {
    const s = await db.staff.findUnique({ where: { id } });
    if (!s) throw new ActionError('Staff member not found.', 404);
    return { ...s, upcoming: await db.appointment.count({ where: { staffId: id, status: 'Booked', date: { gte: isoDate() } } }) };
  });

export const getService = (id: string) =>
  read('services', async () => {
    const x = await db.service.findUnique({ where: { id }, include: { category: { select: { name: true } } } });
    if (!x) throw new ActionError('Service not found.', 404);
    return x;
  });

// ---- Suppliers ----
export const listSuppliers = () =>
  read('suppliers', async () => {
    const [list, products, ins, bills] = await Promise.all([
      db.supplier.findMany({ orderBy: { name: 'asc' } }),
      db.product.groupBy({ by: ['supplierId'], where: { active: true, supplierId: { not: null } }, _count: true }),
      db.stockMovement.groupBy({ by: ['supplierId'], where: { type: 'IN', supplierId: { not: null } }, _count: true, _sum: { change: true }, _max: { createdAt: true } }),
      db.supplierBill.groupBy({ by: ['supplierId'], _sum: { amount: true, paid: true } }),
    ]);
    return list.map((s) => ({
      ...s,
      products: products.find((r) => r.supplierId === s.id)?._count ?? 0,
      deliveries: ins.find((r) => r.supplierId === s.id)?._count ?? 0,
      unitsReceived: ins.find((r) => r.supplierId === s.id)?._sum.change ?? 0,
      lastDelivery: ins.find((r) => r.supplierId === s.id)?._max.createdAt ?? null,
      billed: round2(bills.find((r) => r.supplierId === s.id)?._sum.amount ?? 0),
      due: round2((bills.find((r) => r.supplierId === s.id)?._sum.amount ?? 0) - (bills.find((r) => r.supplierId === s.id)?._sum.paid ?? 0)),
    }));
  });

export const getSupplier = (id: string) =>
  read('suppliers', async () => {
    const s = await db.supplier.findUnique({ where: { id } });
    if (!s) throw new ActionError('Supplier not found.', 404);
    const bills = await db.supplierBill.findMany({
      where: { supplierId: id }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, billNumber: true, date: true, dueDate: true, amount: true, paid: true, notes: true, fileName: true, fileType: true, payments: { orderBy: { date: 'asc' } } },
    });
    return { ...s, bills: bills.map((b) => ({ ...b, hasFile: !!b.fileType, due: round2(b.amount - b.paid) })) };
  });

// ---- Expenses ----
export const listExpenses = (q: Q) =>
  read('expenses', async () => {
    const from = isDate(str(q, 'from')) ? str(q, 'from')! : `${isoDate().slice(0, 7)}-01`;
    const to = isDate(str(q, 'to')) ? str(q, 'to')! : monthEnd(from);
    const items = await db.expense.findMany({
      where: { date: { gte: from, lte: to }, ...(str(q, 'branch') && { branchId: str(q, 'branch') }), ...(str(q, 'category') && { category: str(q, 'category') }) },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], include: { branch: { select: { name: true } } },
    });
    // Totals for every branch in this period, whichever branch is being viewed.
    const perBranch = await db.expense.groupBy({ by: ['branchId'], where: { date: { gte: from, lte: to } }, _sum: { amount: true }, _count: true });
    return { from, to, total: round2(sum(items.map((e) => e.amount))), byBranch: perBranch.map((r) => ({ branchId: r.branchId, total: round2(r._sum.amount ?? 0), count: r._count })), items };
  });

export const getExpense = (id: string) =>
  read('expenses', async () => {
    const x = await db.expense.findUnique({ where: { id }, include: { branch: { select: { name: true } } } });
    if (!x) throw new ActionError('Expense not found.', 404);
    return x;
  });

export const expenseCategories = () => read('expenses', async () => (await db.expense.findMany({ distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } })).map((c) => c.category));

// ---- Settings ----
export const listBranches = () => attempt(async () => { await requireView('dashboard'); return db.branch.findMany({ orderBy: { name: 'asc' } }); });
export const getBranch = (id: string) =>
  attempt(async () => {
    await requireView('dashboard');
    const b = await db.branch.findUnique({ where: { id } });
    if (!b) throw new ActionError('Branch not found.', 404);
    return b;
  });
export const getUser = (id: string) =>
  read('settings', async () => {
    const u = await db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, active: true } });
    if (!u) throw new ActionError('Login not found.', 404);
    return u;
  });
export const getSettings = () => read('dashboard', () => db.settings.findUniqueOrThrow({ where: { id: 1 } }));
export const listUsers = () => read('settings', () => db.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }], select: { id: true, name: true, email: true, role: true, active: true } }));

// ---- Dashboard and reports ----
export const dashboard = () =>
  read('dashboard', async (user) => {
    const money = canView(user.role, 'billing');
    const today = isoDate();
    const start = new Date(`${today}T00:00:00`);
    const live = { invoice: { status: { not: 'Cancelled' } } };
    const [appts, payments, refunds, bills, products, newClients, recent, settings] = await Promise.all([
      db.appointment.findMany({ where: { date: today }, orderBy: { startTime: 'asc' }, include: { customer: { select: { id: true, name: true } }, staff: { select: { name: true } }, services: { select: { name: true } } } }),
      money ? db.payment.findMany({ where: { ...live, createdAt: { gte: start } }, select: { amount: true } }) : [],
      money ? db.refund.findMany({ where: { ...live, createdAt: { gte: start } }, select: { amount: true } }) : [],
      db.invoice.findMany({ where: { status: { not: 'Cancelled' }, createdAt: { gte: start } }, select: { customerId: true, total: true, paid: true } }),
      canView(user.role, 'inventory') ? db.product.findMany({ where: { active: true }, select: { name: true, stock: true, reorderLevel: true } }) : [],
      db.customer.count({ where: { active: true, createdAt: { gte: start } } }),
      money ? db.payment.findMany({ where: live, orderBy: { createdAt: 'desc' }, take: 6, include: { invoice: { select: { id: true, number: true, customer: { select: { name: true } } } } } }) : [],
      db.settings.findUniqueOrThrow({ where: { id: 1 }, select: { name: true, openTime: true, closeTime: true } }),
    ]);
    const liveAppts = appts.filter((a) => !['Cancelled', 'NoShow'].includes(a.status));
    const byStatus: Record<string, number> = {};
    for (const a of appts) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    return {
      date: today,
      appointments: { total: appts.length, byStatus, items: appts },
      newClients,
      salon: settings,
      clientsToday: new Set([...liveAppts.map((a) => a.customer.id), ...bills.map((b) => b.customerId)]).size,
      ...(money && { recentPayments: recent, dueBillsToday: bills.filter((b) => b.total - b.paid > 0.5).length, billsToday: bills.length, collectedToday: round2(sum(payments.map((p) => p.amount)) - sum(refunds.map((r) => r.amount))), dueToday: round2(sum(bills.map((b) => Math.max(b.total - b.paid, 0)))) }),
      ...(canView(user.role, 'inventory') && { lowStock: products.filter((p) => p.stock <= p.reorderLevel) }),
    };
  });

export const report = (q: Q) =>
  read('reports', async () => {
    const { key, from, to } = resolvePeriod({ period: str(q, 'period'), from: str(q, 'from'), to: str(q, 'to') });
    const when = range(from, to);
    const branch = str(q, 'branch');
    const inBranch = branch ? { branchId: branch } : {};
    const [invoices, payments, refunds, expenses, staff, branches] = await Promise.all([
      db.invoice.findMany({ where: { createdAt: when, status: { not: 'Cancelled' }, ...inBranch }, include: { items: true } }),
      db.payment.findMany({ where: { createdAt: when, invoice: { status: { not: 'Cancelled' }, ...inBranch } }, include: { invoice: { select: { branchId: true } } } }),
      db.refund.findMany({ where: { createdAt: when, invoice: { status: { not: 'Cancelled' }, ...inBranch } }, include: { invoice: { select: { branchId: true } } } }),
      db.expense.findMany({ where: { date: { gte: from, lte: to }, ...inBranch } }),
      db.staff.findMany({ select: { id: true, name: true, payType: true, commissionRate: true } }),
      db.branch.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ]);
    // Side by side figures per branch, when all branches are combined.
    const compare = branch ? [] : [...branches.map((b) => ({ id: b.id as string | null, name: b.name })), { id: null, name: 'Not assigned to a branch' }].map((b) => {
      const inv = invoices.filter((i) => i.branchId === b.id);
      const net = sum(inv.map((i) => i.total - i.tax));
      const spentHere = sum(expenses.filter((e) => e.branchId === b.id).map((e) => e.amount));
      const collected = sum(payments.filter((p) => p.invoice.branchId === b.id).map((p) => p.amount)) - sum(refunds.filter((r) => r.invoice.branchId === b.id).map((r) => r.amount));
      return { branchId: b.id, name: b.name, bills: inv.length, netSales: round2(net), expenses: round2(spentHere), profit: round2(net - spentHere), collected: round2(collected) };
    }).filter((r) => r.branchId !== null || r.bills || r.expenses || r.collected);
    const group = <T>(rows: T[], key: (r: T) => string, val: (r: T) => { qty: number; value: number }) => {
      const m = new Map<string, { key: string; qty: number; value: number }>();
      for (const r of rows) { const k = key(r); const v = val(r); const cur = m.get(k) ?? { key: k, qty: 0, value: 0 }; cur.qty += v.qty; cur.value += v.value; m.set(k, cur); }
      return [...m.values()].map((r) => ({ ...r, value: round2(r.value) })).sort((a, b) => b.value - a.value);
    };
    const sales = sum(invoices.map((i) => i.total));
    const tax = sum(invoices.map((i) => i.tax));
    const spent = sum(expenses.map((e) => e.amount));
    const items = invoices.flatMap((i) => i.items);
    const days = Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000) + 1;
    const byMonth = days > 62;
    // Every day (or month) in the range gets a point, even with no sales.
    const series = new Map<string, number>();
    if (byMonth) { for (let d = from; d <= to; d = addDays(d, 28)) series.set(d.slice(0, 7), 0); series.set(to.slice(0, 7), series.get(to.slice(0, 7)) ?? 0); }
    else for (let n = 0; n < days; n++) series.set(addDays(from, n), 0);
    for (const i of invoices) { const k = byMonth ? isoDate(i.createdAt).slice(0, 7) : isoDate(i.createdAt); series.set(k, (series.get(k) ?? 0) + i.total - i.tax); }
    const staffById = new Map(staff.map((s) => [s.id, s]));
    return {
      period: key, from, to, branch: branch ?? null,
      sales: round2(sales), tax: round2(tax), netSales: round2(sales - tax), bills: invoices.length,
      collected: round2(sum(payments.map((p) => p.amount)) - sum(refunds.map((r) => r.amount))),
      dues: round2(sum(invoices.map((i) => i.total - i.paid))), discounts: round2(sum(invoices.map((i) => i.discount))),
      expenses: round2(spent), expenseCount: expenses.length, profit: round2(sales - tax - spent),
      salesBy: byMonth ? 'month' : 'day',
      salesSeries: [...series].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value: round2(value) })),
      topServices: group(items.filter((i) => i.kind === 'service'), (i) => i.name, (i) => ({ qty: i.qty, value: i.total - i.tax })).slice(0, 8),
      topProducts: group(items.filter((i) => i.kind === 'product'), (i) => i.name, (i) => ({ qty: i.qty, value: i.total - i.tax })).slice(0, 8),
      paymentMethods: group([...payments, ...refunds.map((r) => ({ ...r, amount: -r.amount }))], (p) => p.method, (p) => ({ qty: 1, value: p.amount })),
      expenseCategories: group(expenses, (e) => e.category, (e) => ({ qty: 1, value: e.amount })),
      branchComparison: compare,
      staffPerformance: group(items.filter((i) => i.kind === 'service' && i.staffId), (i) => i.staffId!, (i) => ({ qty: i.qty, value: i.total - i.tax }))
        .map(({ key: id, ...r }) => ({ staffId: id, name: staffById.get(id)?.name ?? 'Former staff', commissionRate: staffById.get(id)?.commissionRate ?? 0, salaried: staffById.get(id)?.payType === 'Salary', ...r })),
    };
  });

/** The salon's name and address. Shown on the sign-in page, so it needs no login. */
export const branding = () => attempt(async () => {
  const s = await db.settings.findUnique({ where: { id: 1 }, select: { name: true, address: true } });
  return { name: s?.name ?? null, address: s?.address ?? null };
});

/** The numbers behind the sidebar alerts. Counts a person's role cannot see are left out. */
export const alerts = () =>
  read('dashboard', async (user) => {
    const today = isoDate();
    const [settings, waiting, dues, products, supplierBills] = await Promise.all([
      db.settings.findUnique({ where: { id: 1 }, select: { name: true } }),
      db.appointment.count({ where: { date: today, status: 'CheckedIn' } }),
      canView(user.role, 'billing') ? db.invoice.count({ where: { status: { in: ['Unpaid', 'Partial'] } } }) : 0,
      canView(user.role, 'inventory') ? db.product.findMany({ where: { active: true }, select: { stock: true, reorderLevel: true } }) : [],
      canView(user.role, 'suppliers') ? db.supplierBill.findMany({ where: { dueDate: { lt: today } }, select: { amount: true, paid: true } }) : [],
    ]);
    return {
      salon: settings?.name ?? null,
      waiting,
      billsWithDues: dues,
      lowStock: products.filter((p) => p.stock <= p.reorderLevel).length,
      overdueSupplierBills: supplierBills.filter((b) => b.amount - b.paid > 0.005).length,
    };
  });
