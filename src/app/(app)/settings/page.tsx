import { api } from '@/lib/api-server';
import type { getSettings, listBranches, listUsers } from '@/lib/api-reads';
import type { DataOf } from '@/lib/api-client';
import { requirePage } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { SettingsForms } from './settings-forms';

export default async function SettingsPage() {
  const me = await requirePage('settings');
  const [settings, branches, users] = await Promise.all([
    api<DataOf<typeof getSettings>>('/settings'),
    api<DataOf<typeof listBranches>>('/branches'),
    api<DataOf<typeof listUsers>>('/users'),
  ]);
  return (
    <>
      <PageHeader title="Settings & Users" subtitle="Business details, branches and who can sign in." />
      <SettingsForms settings={settings} branches={branches} users={users} meId={me.id} />
    </>
  );
}
