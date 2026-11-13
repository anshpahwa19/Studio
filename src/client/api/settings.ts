import { call } from '@/client/api/call';
import type * as s from '@/server/features/settings/service';
export type { SettingsInput } from '@/server/features/settings/service';

export const saveSettings = (i: s.SettingsInput) => call('PUT', '/settings', i);
type Branch = Parameters<typeof s.saveBranch>[0];
export const saveBranch = (i: Branch) => call(i.id ? 'PUT' : 'POST', i.id ? `/branches/${i.id}` : '/branches', i);
export const deleteBranch = (id: string) => call('DELETE', `/branches/${id}`);
type User = Parameters<typeof s.saveUser>[0];
export const saveUser = (i: User) => call(i.id ? 'PUT' : 'POST', i.id ? `/users/${i.id}` : '/users', i);
export const deleteUser = (id: string) => call('DELETE', `/users/${id}`);
export const changeMyPassword = (current: string, next: string) => call('POST', '/me/password', { current, next });
