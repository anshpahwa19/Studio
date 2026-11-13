import { call, type DataOf } from '@/lib/api-client';
import type * as s from './service';
export type { StaffInput } from './service';

export const saveStaff = (i: s.StaffInput) => call(i.id ? 'PUT' : 'POST', i.id ? `/staff/${i.id}` : '/staff', i);
export const archiveStaff = (id: string) => call('POST', `/staff/${id}/archive`);
export const restoreStaff = (id: string) => call('POST', `/staff/${id}/restore`);
