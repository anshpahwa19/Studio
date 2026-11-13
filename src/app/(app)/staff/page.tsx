import { api } from '@/lib/api-server';
import type { listStaff } from '@/lib/api-reads';
import type { DataOf } from '@/lib/api-client';
import { requirePage } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { StaffManager } from './staff-manager';

export default async function StaffPage() {
  await requirePage('staff');
  const staff = await api<DataOf<typeof listStaff>>('/staff', { archived: 1 });
  return (
    <>
      <PageHeader title="Staff Management" subtitle="Working days and hours decide when each person can be booked. Pay is either a fixed monthly salary or a commission." />
      <StaffManager staff={staff as React.ComponentProps<typeof StaffManager>['staff']} />
    </>
  );
}
