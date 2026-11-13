import { call, type DataOf } from '@/client/api/call';
import type * as s from '@/server/features/inventory/service';
export type { ProductInput } from '@/server/features/inventory/service';

export const saveProduct = (i: s.ProductInput) => call<DataOf<typeof s.saveProduct>>(i.id ? 'PUT' : 'POST', i.id ? `/products/${i.id}` : '/products', i);
export const deleteProduct = (id: string) => call<DataOf<typeof s.deleteProduct>>('DELETE', `/products/${id}`);
export const moveStock = (i: Parameters<typeof s.moveStock>[0]) => call('POST', '/stock/movements', i);
export const transferStock = (i: Parameters<typeof s.transferStock>[0]) => call('POST', '/stock/transfers', i);
export const stockHistory = (id: string) => call<DataOf<typeof s.stockHistory>>('GET', `/products/${id}/history`);
