import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canEdit } from '@/lib/roles';
import { fmtDate, isoDate, money0 } from '@/lib/format';
import { dueOf } from '@/lib/purchases';
import { Badge, PageHeader, Stat } from '@/components/ui';
import { BillsManager } from './bills-manager';

export default async function SupplierPage({ params }: { params: { id: string } }) {
  const user = await requirePage('suppliers');
  const s = await db.supplier.findUnique({
    where: { id: params.id },
    include: {
      bills: {
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        // Never load the uploaded file here; it is fetched on demand from /suppliers/bill-file/<id>.
        select: { id: true, billNumber: true, date: true, dueDate: true, amount: true, paid: true, notes: true, supplierId: true, fileName: true, payments: { orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] } },
      },
    },
  });
  if (!s) notFound();
  const billed = s.bills.reduce((a, b) => a + b.amount, 0);
  const paid = s.bills.reduce((a, b) => a + b.paid, 0);
  const due = s.bills.reduce((a, b) => a + dueOf(b), 0);
  const today = isoDate();
  const overdue = s.bills.filter((b) => dueOf(b) > 0 && b.dueDate && b.dueDate < today);
  const overdueAmt = overdue.reduce((a, b) => a + dueOf(b), 0);

  return (
    <>
      <Link href="/suppliers" className="no-print mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-soft hover:text-violet-700"><ArrowLeft size={15} />All suppliers</Link>
      <PageHeader
        title={s.name}
        subtitle={<span>{[s.contact, s.phone, s.email].filter(Boolean).join(' · ') || 'Bills and payments with this supplier'}{!s.active && <> · <Badge>Archived</Badge></>}</span>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total billed" value={money0(billed)} note={`${s.bills.length} bills`} />
        <Stat label="Paid" value={money0(paid)} tone="good" />
        <Stat label="Balance due" value={money0(due)} tone={due > 0.5 ? 'warn' : undefined} />
        <Stat label="Overdue" value={money0(overdueAmt)} tone={overdue.length ? 'warn' : undefined} note={overdue.length ? `${overdue.length} past due date` : 'Nothing overdue'} />
      </div>
      <BillsManager
        supplier={{ id: s.id, name: s.name }}
        today={today}
        editable={canEdit(user.role, 'suppliers')}
        bills={s.bills.map((b) => ({ id: b.id, billNumber: b.billNumber, date: b.date, dueDate: b.dueDate, amount: b.amount, paid: b.paid, notes: b.notes, fileName: b.fileName, payments: b.payments.map((p) => ({ id: p.id, date: p.date, amount: p.amount, method: p.method, reference: p.reference })) }))}
      />
      <p className="mt-3 text-[12.5px] text-ink-mute">{s.bills.length ? `Latest bill ${fmtDate(s.bills[0].date)}.` : ''} Payments recorded here are not added to Expenses automatically.</p>
    </>
  );
}
