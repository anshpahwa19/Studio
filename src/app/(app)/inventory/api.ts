import { call, type DataOf } from '@/lib/api-client';
import type * as s from './service';
export type { ProductInput } from './service';

export const saveProduct = (i: s.ProductInput) => call<DataOf<typeof s.saveProduct>>(i.id ? 'PUT' : 'POST', i.id ? `/products/${i.id}` : '/products', i);
export const archiveProduct = (id: string) => call('POST', `/products/${id}/archive`);
export const deleteProduct = (id: string) => call<DataOf<typeof s.deleteProduct>>('DELETE', `/products/${id}`);
export const moveStock = (i: Parameters<typeof s.moveStock>[0]) => call('POST', '/stock/movements', i);
export const transferStock = (i: Parameters<typeof s.transferStock>[0]) => call('POST', '/stock/transfers', i);
export const stockHistory = (id: string) => call<DataOf<typeof s.stockHistory>>('GET', `/products/${id}/history`);
