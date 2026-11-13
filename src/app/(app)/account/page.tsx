import { currentUser } from '@/server/auth/session';
import { redirect } from 'next/navigation';
import { Card, PageHeader } from '@/components/ui';
import { PasswordForm } from './password-form';

export default async function AccountPage() {
  const me = await currentUser();
  if (!me) redirect('/login');
  return (
    <>
      <PageHeader title="My Account" subtitle={`${me.name} · ${me.email} · ${me.role}`} />
      <Card title="Change password" className="max-w-md"><PasswordForm /></Card>
    </>
  );
}
