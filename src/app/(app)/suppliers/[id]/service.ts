import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { ActionError, requireEdit } from '@/lib/session';
import { round2 } from '@/lib/format';
import * as v from '@/lib/validate';

const amount = z.coerce.number().positive('must be above zero').max(100_000_000);
const optionalDate = v.date.or(z.literal('')).optional().nullable().transform((d) => d || null);

const billSchema = z.object({
  id: z.string().optional(),
  supplierId: v.id,
  billNumber: v.optional(60),
  date: v.date,
  dueDate: optionalDate,
  amount,
  notes: v.optional(300),
  paidNow: z.coerce.number().min(0).max(100_000_000).optional(),
  method: z.enum(v.PAYMENT_METHODS).optional(),
});
export type BillInput = z.input<typeof billSchema>;

const refresh = (supplierId: string) => { revalidatePath(`/suppliers/${supplierId}`); revalidatePath('/suppliers'); };

const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE = 5 * 1024 * 1024;

/** Takes the form as FormData so the bill's photo or PDF can come along with the amount. */
export async function saveBill(form: FormData) {
  return attempt(async () => {
    await requireEdit('suppliers');
    const text: Record<string, FormDataEntryValue> = {};
    for (const [k, val] of form.entries()) if (typeof val === 'string') text[k] = val;
    const { id, paidNow, method, ...data } = billSchema.parse(text);
    if (data.dueDate && data.dueDate < data.date) throw new ActionError('The due date cannot be before the bill date.');

    const upload = form.get('file');
    let file: { fileName: string; fileType: string; fileData: Buffer } | null = null;
    if (upload instanceof File && upload.size > 0) {
      if (!FILE_TYPES.includes(upload.type)) throw new ActionError('Upload a PDF or a photo (JPG, PNG, WebP).');
      if (upload.size > MAX_FILE) throw new ActionError('The file is larger than 5 MB.');
      file = { fileName: upload.name.slice(0, 120), fileType: upload.type, fileData: Buffer.from(await upload.arrayBuffer()) };
    }
    const removeFile = form.get('removeFile') === '1';

    if (id) {
      const bill = await db.supplierBill.findUnique({ where: { id }, select: { paid: true } });
      if (!bill) throw new ActionError('Bill not found.');
      if (data.amount < bill.paid - 0.005) throw new ActionError(`Already paid ₹${bill.paid}. The bill cannot be less than that.`);
      await db.supplierBill.update({
        where: { id },
        data: {
          billNumber: data.billNumber, date: data.date, dueDate: data.dueDate, amount: data.amount, notes: data.notes,
          ...(file ?? (removeFile ? { fileName: null, fileType: null, fileData: null } : {})),
        },
      });
    } else {
      const first = paidNow ? round2(paidNow) : 0;
      if (first > data.amount) throw new ActionError('The amount paid now is more than the bill.');
      await db.supplierBill.create({
        data: {
          supplierId: data.supplierId, billNumber: data.billNumber, date: data.date, dueDate: data.dueDate, amount: data.amount, notes: data.notes, paid: first,
          ...file,
          ...(first > 0 && { payments: { create: { date: data.date, amount: first, method: method ?? 'Cash' } } }),
        },
      });
    }
    refresh(data.supplierId);
  });
}

export async function deleteBill(id: string) {
  return attempt(async () => {
    await requireEdit('suppliers');
    const bill = await db.supplierBill.delete({ where: { id } });
    refresh(bill.supplierId);
  });
}

const paySchema = z.object({ billId: v.id, date: v.date, amount, method: z.enum(v.PAYMENT_METHODS), reference: v.optional(80) });
export type PaymentInput = z.input<typeof paySchema>;

export async function addPayment(input: PaymentInput) {
  return attempt(async () => {
    await requireEdit('suppliers');
    const d = paySchema.parse(input);
    const supplierId = await db.$transaction(async (tx) => {
      const bill = await tx.supplierBill.findUnique({ where: { id: d.billId } });
      if (!bill) throw new ActionError('Bill not found.');
      const due = round2(bill.amount - bill.paid);
      if (due <= 0) throw new ActionError('This bill is already fully paid.');
      if (d.amount > due + 0.005) throw new ActionError(`Only ₹${due} is still due on this bill.`);
      await tx.supplierPayment.create({ data: d });
      await tx.supplierBill.update({ where: { id: bill.id }, data: { paid: round2(bill.paid + d.amount) } });
      return bill.supplierId;
    });
    refresh(supplierId);
  });
}

export async function deletePayment(id: string) {
  return attempt(async () => {
    await requireEdit('suppliers');
    const supplierId = await db.$transaction(async (tx) => {
      const pay = await tx.supplierPayment.findUnique({ where: { id }, include: { bill: true } });
      if (!pay) throw new ActionError('Payment not found.');
      await tx.supplierPayment.delete({ where: { id } });
      await tx.supplierBill.update({ where: { id: pay.billId }, data: { paid: Math.max(0, round2(pay.bill.paid - pay.amount)) } });
      return pay.bill.supplierId;
    });
    refresh(supplierId);
  });
}
