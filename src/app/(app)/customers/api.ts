import { call, type DataOf } from '@/client/api-client';
import type * as s from '@/server/features/customers/service';
export type { CustomerInput, ImportResult } from '@/server/features/customers/service';

export const saveCustomer = (i: s.CustomerInput) => call<DataOf<typeof s.saveCustomer>>(i.id ? 'PUT' : 'POST', i.id ? `/customers/${i.id}` : '/customers', i);
export const archiveCustomer = (id: string) => call('DELETE', `/customers/${id}`);
export const importCustomers = (csv: string) => call<DataOf<typeof s.importCustomers>>('POST', '/customers/import', { csv });
