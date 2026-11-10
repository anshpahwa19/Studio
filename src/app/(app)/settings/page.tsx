import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { SettingsForms } from './settings-forms';

export default async function SettingsPage() {
  const me = await requirePage('settings');
  const [settings, branches, users] = await Promise.all([
    db.settings.findUniqueOrThrow({ where: { id: 1 } }),
    db.branch.findMany({ orderBy: { name: 'asc' } }),
    db.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }], select: { id: true, name: true, email: true, role: true, active: true } }),
  ]);
  return (
    <>
      <PageHeader title="Settings & Users" subtitle="Business details, branches and who can sign in." />
      <SettingsForms settings={settings} branches={branches} users={users} meId={me.id} />
    </>
  );
}
