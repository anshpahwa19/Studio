import { call, type DataOf } from '@/client/api/call';
import type * as s from '@/server/features/billing/service';
export type { InvoiceInput, RefundInput } from '@/server/features/billing/service';

export const createInvoice = (i: s.InvoiceInput) => call<DataOf<typeof s.createInvoice>>('POST', '/invoices', i);
export const addPayment = (invoiceId: string, i: Parameters<typeof s.addPayment>[1]) => call('POST', `/invoices/${invoiceId}/payments`, i);
export const cancelInvoice = (invoiceId: string, reason: string, refundMethod?: string | null) => call('POST', `/invoices/${invoiceId}/cancel`, { reason, refundMethod });
export const refundInvoice = (invoiceId: string, i: s.RefundInput) => call('POST', `/invoices/${invoiceId}/refunds`, i);
