import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { ActionError } from '@/server/auth/session';
import { canView } from '@/lib/roles';
import { round2 } from '@/lib/format';
import { read, page, str, sum, type Q } from '@/server/api/helpers';

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
