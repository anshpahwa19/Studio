import { api } from '@/server/api/fetch';
import type { listStaff } from '@/server/features/staff/queries';
import type { DataOf } from '@/client/api-client';
import { requirePage } from '@/server/auth/session';
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
