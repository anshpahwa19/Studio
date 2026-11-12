'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { attempt } from '@/lib/action';
import { ActionError, requireEdit } from '@/lib/session';
import * as v from '@/lib/validate';
import { parseCsv } from '@/lib/csv';

const schema = z.object({
  id: z.string().optional(),
  name: v.personName,
  phone: v.phone,
  email: v.email,
  gender: z.string().nullish().refine((g): g is string => !!g && ['Female', 'Male', 'Other'].includes(g), 'choose a gender'),
  birthday: v.optional(10),
  address: v.optional(300),
  notes: v.optional(1000),
  hairNotes: v.optional(1000),
  nailNotes: v.optional(1000),
  preferredStaffId: v.optional(40),
  branchId: v.optional(40),
});
export type CustomerInput = z.input<typeof schema>;

export async function saveCustomer(input: CustomerInput) {
  return attempt(async () => {
    await requireEdit('customers');
    const { id, ...data } = schema.parse(input);
    const c = id ? await db.customer.update({ where: { id }, data }) : await db.customer.create({ data });
    revalidatePath('/customers');
    return { id: c.id, name: c.name, phone: c.phone };
  });
}

export async function archiveCustomer(id: string) {
  return attempt(async () => {
    await requireEdit('customers');
    await db.customer.update({ where: { id }, data: { active: false } });
    revalidatePath('/customers');
  });
}

export type ImportResult = { added: number; updated: number; errors: string[] };

/**
 * Bulk upload from CSV text. Columns: Name, Mobile, Email, Gender, Branch, Preferred stylist, Notes.
 * A row whose mobile number already exists updates that client; otherwise a new client is added.
 */
export async function importCustomers(csv: string) {
  return attempt(async (): Promise<ImportResult> => {
    await requireEdit('customers');
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new ActionError('The file has no clients in it. Use the template for the right columns.');
    if (rows.length > 2001) throw new ActionError('Upload at most 2,000 clients at a time.');
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => head.indexOf(name);
    const idx = { name: col('name'), phone: col('mobile'), email: col('email'), gender: col('gender'), branch: col('branch'), stylist: col('preferred stylist'), notes: col('notes') };
    if (idx.name < 0 || idx.phone < 0) throw new ActionError('The first row must have the columns Name and Mobile. Download the template to see the format.');

    const [branches, staff] = await Promise.all([db.branch.findMany({ select: { id: true, name: true } }), db.staff.findMany({ select: { id: true, name: true } })]);
    const byName = (list: { id: string; name: string }[], n: string) => list.find((x) => x.name.toLowerCase() === n.trim().toLowerCase())?.id;
    const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim().replace(/^'/, '') : '');
    const res: ImportResult = { added: 0, updated: 0, errors: [] };
    const seen = new Set<string>();

    for (let n = 1; n < rows.length; n++) {
      const r = rows[n];
      const line = n + 1;
      const g = get(r, idx.gender).toLowerCase();
      const gender = g.startsWith('f') ? 'Female' : g.startsWith('m') ? 'Male' : g ? 'Other' : '';
      const branchText = get(r, idx.branch);
      const stylistText = get(r, idx.stylist);
      const branchId = branchText ? byName(branches, branchText) : undefined;
      const staffId = stylistText ? byName(staff, stylistText) : undefined;
      if (branchText && !branchId) { res.errors.push(`Row ${line}: branch "${branchText}" does not exist`); continue; }
      if (stylistText && !staffId) { res.errors.push(`Row ${line}: stylist "${stylistText}" does not exist`); continue; }
      const parsed = schema.safeParse({ name: get(r, idx.name), phone: get(r, idx.phone), email: get(r, idx.email), gender, notes: get(r, idx.notes), branchId, preferredStaffId: staffId });
      if (!parsed.success) { const i = parsed.error.issues[0]; res.errors.push(`Row ${line}: ${i.path.join(' ') || 'row'} ${i.message}`); continue; }
      const { id: _id, ...data } = parsed.data;
      if (seen.has(data.phone)) { res.errors.push(`Row ${line}: mobile ${data.phone} appears twice in the file`); continue; }
      seen.add(data.phone);
      const existing = await db.customer.findUnique({ where: { phone: data.phone } });
      if (existing) {
        // Only fill in what the file provides, so blank cells never wipe saved details.
        const patch = Object.fromEntries(Object.entries(data).filter(([k, val]) => k === 'name' || k === 'gender' || (val !== null && val !== undefined && val !== '')));
        await db.customer.update({ where: { id: existing.id }, data: { ...patch, active: true } });
        res.updated++;
      } else {
        await db.customer.create({ data });
        res.added++;
      }
    }
    revalidatePath('/customers');
    return res;
  });
}
