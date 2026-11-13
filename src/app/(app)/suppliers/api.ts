import { call, type DataOf } from '@/lib/api-client';
import type * as s from './service';
export type { SupplierInput } from './service';

export const saveSupplier = (i: s.SupplierInput) => call(i.id ? 'PUT' : 'POST', i.id ? `/suppliers/${i.id}` : '/suppliers', i);
export const setSupplierActive = (id: string, active: boolean) => call('POST', `/suppliers/${id}/active`, { active });
