'use server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { ActionError, currentUser, requireEdit } from '@/lib/session';
import { ROLES } from '@/lib/roles';
import { toMinutes } from '@/lib/format';
import * as v from '@/lib/validate';

const settingsSchema = z.object({
  name: v.required(120),
  address: v.text(300),
  phone: v.text(40),
  email: v.text(120),
  gstin: z.string().trim().toUpperCase().regex(/^$|^[0-9]{2}[A-Z0-9]{13}$/, 'should be 15 characters, like 06ABCDE1234F1Z5'),
  openTime: v.time,
  closeTime: v.time,
  invoicePrefix: z.string().trim().max(8).regex(/^[A-Za-z0-9-]*$/, 'use letters, numbers or -'),
  nextInvoiceNo: z.coerce.number().int().min(1),
  gstRate: v.gstRate,
  invoiceFooter: v.text(300),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export async function saveSettings(input: SettingsInput) {
  return attempt(async () => {
    await requireEdit('settings');
    const d = settingsSchema.parse(input);
    if (toMinutes(d.closeTime) <= toMinutes(d.openTime)) throw new ActionError('Closing time must be after opening time.');
    const taken = await db.invoice.findUnique({ where: { number: `${d.invoicePrefix}${d.nextInvoiceNo}` } });
    if (taken) throw new ActionError(`Bill ${taken.number} already exists. Choose a higher next number.`);
    await db.settings.update({ where: { id: 1 }, data: d });
    revalidatePath('/', 'layout');
  });
}

const branchSchema = z.object({ id: z.string().optional(), name: v.required(80), address: v.text(300), active: z.boolean().default(true) });
export async function saveBranch(input: z.input<typeof branchSchema>) {
  return attempt(async () => {
    await requireEdit('settings');
    const { id, ...data } = branchSchema.parse(input);
    if (id) await db.branch.update({ where: { id }, data });
    else await db.branch.create({ data });
    revalidatePath('/settings');
  });
}

/** Deletes a branch that has no history. A branch with bookings, bills or expenses should be marked Closed instead. */
export async function deleteBranch(id: string) {
  return attempt(async () => {
    await requireEdit('settings');
    const [appts, bills, expenses] = await Promise.all([
      db.appointment.count({ where: { branchId: id } }),
      db.invoice.count({ where: { branchId: id } }),
      db.expense.count({ where: { branchId: id } }),
    ]);
    if (appts || bills || expenses) {
      const parts = [appts && `${appts} appointment${appts > 1 ? 's' : ''}`, bills && `${bills} bill${bills > 1 ? 's' : ''}`, expenses && `${expenses} expense${expenses > 1 ? 's' : ''}`].filter(Boolean).join(', ');
      throw new ActionError(`This branch has ${parts} on record, so it cannot be deleted. Edit it and untick Open to hide it instead.`);
    }
    await db.branch.delete({ where: { id } });
    revalidatePath('/settings');
  });
}

const userSchema = z.object({
  id: z.string().optional(),
  name: v.required(80),
  email: z.string().trim().toLowerCase().email('enter a valid email'),
  role: z.enum(ROLES),
  active: z.boolean().default(true),
  password: z.string().max(100).optional(),
});
export async function saveUser(input: z.input<typeof userSchema>) {
  return attempt(async () => {
    const me = await requireEdit('settings');
    const { id, password, ...data } = userSchema.parse(input);
    if (password && password.length < 8) throw new ActionError('Passwords need at least 8 characters.');
    if (id === me.id && (data.role !== 'Owner' || !data.active)) throw new ActionError('You cannot remove your own owner access.');
    if (id) {
      await db.user.update({ where: { id }, data: { ...data, ...(password && { passwordHash: await bcrypt.hash(password, 10) }) } });
    } else {
      if (!password) throw new ActionError('Set a password for the new login.');
      await db.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
    }
    revalidatePath('/settings');
  });
}

export async function deleteUser(id: string) {
  return attempt(async () => {
    const me = await requireEdit('settings');
    if (id === me.id) throw new ActionError('You cannot delete your own login.');
    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new ActionError('That login no longer exists.');
    if (target.role === 'Owner' && target.active && (await db.user.count({ where: { role: 'Owner', active: true, id: { not: id } } })) === 0) {
      throw new ActionError('There must be at least one active owner login.');
    }
    await db.user.delete({ where: { id } });
    revalidatePath('/settings');
  });
}

export async function changeMyPassword(current: string, next: string) {
  return attempt(async () => {
    const me = await currentUser();
    if (!me) throw new ActionError('Your session has ended. Sign in again.');
    if (next.length < 8) throw new ActionError('The new password needs at least 8 characters.');
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await bcrypt.compare(current, user.passwordHash))) throw new ActionError('Your current password is not right.');
    await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  });
}
