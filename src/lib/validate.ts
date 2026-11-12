import { z } from 'zod';

export const text = (max = 200) => z.string().trim().max(max);
export const required = (max = 200) => z.string().trim().min(1, 'is required').max(max);
export const personName = z.string().trim().min(2, 'enter the full name').max(100).refine((n) => !/[0-9]/.test(n), 'should not contain numbers');
export const optional = (max = 500) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const validPhone = (p: string) => /^\+?[0-9 -]+$/.test(p) && p.replace(/\D/g, '').length >= 10 && p.replace(/\D/g, '').length <= 13;
export const phone = z.string().trim().refine(validPhone, 'enter a valid phone number (10 digits, numbers only)');
/** A phone number that may be left blank. */
export const phoneOrBlank = z.string().trim().refine((p) => p === '' || validPhone(p), 'enter a valid phone number (10 digits, numbers only)');
export const optionalPhone = z.string().trim().optional().nullable()
  .refine((p) => !p || validPhone(p), 'enter a valid phone number (10 digits, numbers only)').transform((p) => (p ? p : null));
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const optionalGstin = z.string().trim().toUpperCase().optional().nullable()
  .refine((g) => !g || GSTIN_RE.test(g), 'should be 15 characters, like 06ABCDE1234F1Z5').transform((g) => (g ? g : null));
/** HTML attributes that make a phone field show a number keypad and reject letters before saving. */
export const phoneProps = { type: 'tel', inputMode: 'tel', maxLength: 20, pattern: '\\+?[0-9 \\-]{10,20}', title: 'Enter a 10 digit phone number, numbers only' } as const;
export const gstinProps = { maxLength: 15, pattern: '[0-9A-Za-z]{15}', title: '15 characters, like 06ABCDE1234F1Z5' } as const;
export const email = z.string().trim().email('enter a valid email').or(z.literal('')).optional().nullable()
  .transform((v) => (v ? v.toLowerCase() : null));
export const money = z.coerce.number().min(0, 'cannot be negative').max(10_000_000);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pick a date');
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'pick a time');
export const id = z.string().min(1);
export const GST_RATES = [5, 12, 18, 28] as const;
export const gstRate = z.coerce.number().refine((n) => (GST_RATES as readonly number[]).includes(n), 'choose a GST rate');
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank'] as const;
