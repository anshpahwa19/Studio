import 'server-only';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { lookupUser } from '@/lib/session';
import { canView } from '@/lib/roles';
import { isoDate, round2 } from '@/lib/format';
import { range, resolvePeriod } from '@/app/(app)/reports/period';

export async function GET(req: NextRequest) {
  const user = await lookupUser();
  if (!user || !canView(user.role, 'reports')) return new Response('Not allowed', { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { from, to } = resolvePeriod(sp);
  const branchId = sp.branch ? { branchId: sp.branch } : {};
  let rows: (string | number)[][];

  if (sp.type === 'expenses') {
    const list = await db.expense.findMany({ where: { date: { gte: from, lte: to }, ...branchId }, orderBy: { date: 'asc' }, include: { branch: true } });
    rows = [['Date', 'Category', 'Description', 'Paid to', 'Method', 'Branch', 'Amount'],
      ...list.map((e) => [e.date, e.category, e.description, e.vendor ?? '', e.method, e.branch?.name ?? '', round2(e.amount)])];
  } else {
    const list = await db.invoice.findMany({ where: { createdAt: range(from, to), ...branchId }, orderBy: { createdAt: 'asc' }, include: { customer: true, branch: true, payments: true } });
    rows = [['Bill', 'Date', 'Client', 'Mobile', 'Branch', 'Status', 'Subtotal', 'Discount', 'Taxable value', 'CGST', 'SGST', 'Total', 'Paid', 'Refunded', 'Due', 'Payment methods'],
      ...list.map((i) => [
        i.number, isoDate(i.createdAt), i.customer.name, i.customer.phone, i.branch?.name ?? '', i.status,
        round2(i.subtotal), round2(i.discount), round2(i.subtotal - i.discount), round2(i.tax / 2), round2(i.tax / 2), round2(i.total), round2(i.paid), round2(i.refunded),
        i.status === 'Cancelled' ? 0 : round2(i.total - i.paid), [...new Set(i.payments.map((p) => p.method))].join(' + '),
      ])];
  }

  const csv = rows.map((r) => r.map(cell).join(',')).join('\r\n');
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${sp.type === 'expenses' ? 'expenses' : 'sales'}-${from}-to-${to}.csv"`,
    },
  });
}

// Quote text cells, and stop spreadsheet apps from treating text like "=..." as a formula.
const cell = (v: string | number) => {
  if (typeof v === 'number') return String(v);
  const s = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\r\n']/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
