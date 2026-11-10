import { z } from 'zod';

export const text = (max = 200) => z.string().trim().max(max);
export const required = (max = 200) => z.string().trim().min(1, 'is required').max(max);
export const optional = (max = 500) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
export const phone = z.string().trim().min(7, 'enter a valid phone number').max(20);
export const email = z.string().trim().email('enter a valid email').or(z.literal('')).optional().nullable()
  .transform((v) => (v ? v.toLowerCase() : null));
export const money = z.coerce.number().min(0, 'cannot be negative').max(10_000_000);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pick a date');
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'pick a time');
export const id = z.string().min(1);
export const TAX_RATES = [0, 5, 12, 18, 28] as const;
export const taxRate = z.coerce.number().refine((n) => (TAX_RATES as readonly number[]).includes(n), 'choose a GST slab');
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank'] as const;
