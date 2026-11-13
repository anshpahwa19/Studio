import { call, type DataOf } from '@/client/api-client';
import type * as s from '@/server/features/suppliers/service';
export type { SupplierInput } from '@/server/features/suppliers/service';

export const saveSupplier = (i: s.SupplierInput) => call(i.id ? 'PUT' : 'POST', i.id ? `/suppliers/${i.id}` : '/suppliers', i);
export const setSupplierActive = (id: string, active: boolean) => call('POST', `/suppliers/${id}/active`, { active });
