import { call, type DataOf } from '@/lib/api-client';
import type * as s from './service';
export type { BillInput, PaymentInput } from './service';

export const saveBill = (form: FormData) => { const id = form.get('id'); return call(id ? 'PUT' : 'POST', id ? `/supplier-bills/${id}` : '/supplier-bills', form); };
export const deleteBill = (id: string) => call('DELETE', `/supplier-bills/${id}`);
export const addPayment = (i: s.PaymentInput) => call('POST', '/supplier-payments', i);
export const deletePayment = (id: string) => call('DELETE', `/supplier-payments/${id}`);
