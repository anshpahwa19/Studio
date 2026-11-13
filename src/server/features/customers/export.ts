import 'server-only';
import { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { lookupUser } from '@/server/auth/session';
import { canView } from '@/lib/roles';
import { isoDate } from '@/lib/format';
import { csvCell } from '@/lib/csv';

const CUSTOMER_COLUMNS = ['Name', 'Mobile', 'Email', 'Gender', 'Branch', 'Preferred stylist', 'Notes'];

/** All active clients as CSV, in the same columns the bulk upload reads. ?template=1 gives just the header and an example row. */
export async function GET(req: NextRequest) {
  const user = await lookupUser();
  if (!user || !canView(user.role, 'customers')) return new Response('Not allowed', { status: 403 });
  const sp = req.nextUrl.searchParams;
  let rows: (string | number)[][];
  if (sp.get('template')) {
    rows = [CUSTOMER_COLUMNS, ['Priya Sharma', '9876543210', 'priya@example.com', 'Female', '', '', 'Prefers evening slots']];
  } else {
    const q = sp.get('q')?.trim();
    const branch = sp.get('branch');
    const list = await db.customer.findMany({
      where: { active: true, ...(branch && { branchId: branch }), ...(q && { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] }) },
      orderBy: { name: 'asc' },
      include: { branch: { select: { name: true } }, preferredStaff: { select: { name: true } } },
    });
    rows = [CUSTOMER_COLUMNS, ...list.map((c) => [c.name, c.phone, c.email ?? '', c.gender ?? '', c.branch?.name ?? '', c.preferredStaff?.name ?? '', [c.notes, c.hairNotes && `Hair: ${c.hairNotes}`, c.nailNotes && `Nails: ${c.nailNotes}`].filter(Boolean).join(' | ')])];
  }
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${sp.get('template') ? 'clients-template' : `clients-${isoDate()}`}.csv"`,
    },
  });
}
