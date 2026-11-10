'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { ActionError, requireEdit } from '@/lib/session';
import { isSenior } from '@/lib/roles';
import { computeBill, invoiceStatus } from '@/lib/billing';
import { money, round2 } from '@/lib/format';
import * as v from '@/lib/validate';

const payment = z.object({
  amount: z.coerce.number().min(0).max(10_000_000),
  method: z.enum(v.PAYMENT_METHODS),
  reference: v.optional(80),
});

const schema = z.object({
  customerId: z.string().min(1, 'choose a client'),
  appointmentId: v.optional(40),
  branchId: v.optional(40),
  lines: z.array(z.object({
    kind: z.enum(['service', 'product']),
    refId: v.id,
    staffId: v.optional(40),
    qty: z.coerce.number().int().min(1).max(999),
    unitPrice: v.money,
  })).min(1, 'add at least one service or product'),
  discountType: z.enum(['percent', 'amount']).nullable(),
  discountValue: z.coerce.number().min(0).default(0),
  payments: z.array(payment),
  notes: v.optional(500),
});
export type InvoiceInput = z.input<typeof schema>;

export async function createInvoice(input: InvoiceInput) {
  return attempt(async () => {
    const user = await requireEdit('billing');
    const d = schema.parse(input);

    const id = await db.$transaction(async (tx) => {
      const [services, products] = await Promise.all([
        tx.service.findMany({ where: { id: { in: d.lines.filter((l) => l.kind === 'service').map((l) => l.refId) } } }),
        tx.product.findMany({ where: { id: { in: d.lines.filter((l) => l.kind === 'product').map((l) => l.refId) } } }),
      ]);
      const lines = d.lines.map((l) => {
        const ref = l.kind === 'service' ? services.find((s) => s.id === l.refId) : products.find((p) => p.id === l.refId);
        if (!ref) throw new ActionError('An item on this bill no longer exists. Remove it and try again.');
        return { ...l, name: ref.name, taxRate: ref.taxRate };
      });

      // Stock check, adding up repeated lines for the same product.
      const need = new Map<string, number>();
      for (const l of lines) if (l.kind === 'product') need.set(l.refId, (need.get(l.refId) ?? 0) + l.qty);
      for (const [pid, qty] of need) {
        const p = products.find((x) => x.id === pid)!;
        if (p.stock < qty) throw new ActionError(`Only ${p.stock} ${p.unit} of ${p.name} in stock. Update the stock in Inventory if more has arrived.`);
      }

      if (d.appointmentId) {
        const appt = await tx.appointment.findUnique({ where: { id: d.appointmentId }, include: { invoice: true } });
        if (!appt) throw new ActionError('The linked appointment no longer exists.');
        if (appt.invoice) throw new ActionError(`This appointment is already billed on ${appt.invoice.number}.`);
        if (appt.customerId !== d.customerId) throw new ActionError('The client does not match the appointment.');
      }

      const calc = computeBill(lines, { type: d.discountType, value: d.discountValue });
      const payments = d.payments.filter((p) => p.amount > 0).map((p) => ({ ...p, amount: round2(p.amount) }));
      const paid = round2(payments.reduce((a, p) => a + p.amount, 0));
      if (paid > calc.total + 0.005) throw new ActionError(`Payments add up to ${money(paid)}, more than the bill total of ${money(calc.total)}.`);

      const settings = await tx.settings.update({ where: { id: 1 }, data: { nextInvoiceNo: { increment: 1 } } });
      const number = `${settings.invoicePrefix}${settings.nextInvoiceNo - 1}`;

      const inv = await tx.invoice.create({
        data: {
          number, customerId: d.customerId, appointmentId: d.appointmentId, branchId: d.branchId,
          subtotal: calc.subtotal, discountType: calc.discount > 0 ? d.discountType : null, discountValue: calc.discount > 0 ? d.discountValue : 0,
          discount: calc.discount, tax: calc.tax, total: calc.total, paid, status: invoiceStatus(calc.total, paid),
          notes: d.notes, createdBy: user.name,
          items: {
            create: lines.map((l, i) => ({
              kind: l.kind, serviceId: l.kind === 'service' ? l.refId : null, productId: l.kind === 'product' ? l.refId : null,
              staffId: l.staffId, name: l.name, qty: l.qty, unitPrice: l.unitPrice, taxRate: l.taxRate,
              discount: calc.lines[i].discount, tax: calc.lines[i].tax, total: calc.lines[i].total,
            })),
          },
          payments: { create: payments },
        },
      });

      for (const [pid, qty] of need) {
        const p = await tx.product.update({ where: { id: pid }, data: { stock: { decrement: qty } } });
        await tx.stockMovement.create({ data: { productId: pid, type: 'SALE', change: -qty, balance: p.stock, invoiceId: inv.id, note: `Sold on ${number}` } });
      }
      if (d.appointmentId) await tx.appointment.update({ where: { id: d.appointmentId }, data: { status: 'Completed' } });
      return inv.id;
    });

    revalidatePath('/billing');
    revalidatePath('/dashboard');
    return { id };
  });
}

export async function addPayment(invoiceId: string, input: z.input<typeof payment>) {
  return attempt(async () => {
    await requireEdit('billing');
    const p = payment.parse(input);
    if (p.amount <= 0) throw new ActionError('Enter an amount above zero.');
    await db.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!inv || inv.status === 'Void') throw new ActionError('This bill cannot take payments.');
      const due = round2(inv.total - inv.paid);
      if (p.amount > due + 0.005) throw new ActionError(`Only ${money(due)} is due on this bill.`);
      const paid = round2(inv.paid + p.amount);
      await tx.payment.create({ data: { invoiceId, amount: round2(p.amount), method: p.method, reference: p.reference } });
      await tx.invoice.update({ where: { id: invoiceId }, data: { paid, status: invoiceStatus(inv.total, paid) } });
    });
    revalidatePath(`/billing/${invoiceId}`);
    revalidatePath('/billing');
  });
}

export async function voidInvoice(invoiceId: string, reason: string) {
  return attempt(async () => {
    const user = await requireEdit('billing');
    if (!isSenior(user.role)) throw new ActionError('Only the owner or a manager can void a bill.');
    const why = v.required(200).parse(reason);
    await db.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { items: true } });
      if (!inv || inv.status === 'Void') throw new ActionError('This bill is already void.');
      for (const item of inv.items.filter((i) => i.productId)) {
        const p = await tx.product.update({ where: { id: item.productId! }, data: { stock: { increment: item.qty } } });
        await tx.stockMovement.create({ data: { productId: p.id, type: 'RETURN', change: item.qty, balance: p.stock, invoiceId, note: `Bill ${inv.number} voided` } });
      }
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'Void', appointmentId: null, notes: [inv.notes, `Voided by ${user.name}: ${why}`].filter(Boolean).join('\n') },
      });
    });
    revalidatePath('/billing');
    revalidatePath(`/billing/${invoiceId}`);
    revalidatePath('/dashboard');
  });
}
