import { call, type DataOf } from '@/client/api/call';
import type * as s from '@/server/features/suppliers/bills';
export type { BillInput, PaymentInput } from '@/server/features/suppliers/bills';

export const saveBill = (form: FormData) => { const id = form.get('id'); return call(id ? 'PUT' : 'POST', id ? `/supplier-bills/${id}` : '/supplier-bills', form); };
export const deleteBill = (id: string) => call('DELETE', `/supplier-bills/${id}`);
export const addPayment = (i: s.PaymentInput) => call('POST', '/supplier-payments', i);
export const deletePayment = (id: string) => call('DELETE', `/supplier-payments/${id}`);
