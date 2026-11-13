import { call, type DataOf } from '@/client/api-client';
import type * as s from '@/server/features/services/service';
export type { ServiceInput } from '@/server/features/services/service';

export const saveService = (i: s.ServiceInput) => call(i.id ? 'PUT' : 'POST', i.id ? `/services/${i.id}` : '/services', i);
export const archiveService = (id: string) => call('POST', `/services/${id}/archive`);
export const restoreService = (id: string) => call('POST', `/services/${id}/restore`);
export const addCategory = (name: string) => call('POST', '/service-categories', { name });
