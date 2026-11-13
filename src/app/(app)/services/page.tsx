import { api } from '@/lib/api-server';
import type { listServices } from '@/lib/api-reads';
import type { DataOf } from '@/lib/api-client';
import { requirePage } from '@/lib/session';
import { canEdit } from '@/lib/roles';
import { PageHeader } from '@/components/ui';
import { plural } from '@/lib/format';
import { ServiceManager } from './service-manager';

export default async function ServicesPage() {
  const user = await requirePage('services');
  const categories = await api<DataOf<typeof listServices>>('/services', { archived: 1 });
  const count = categories.reduce((a, c) => a + c.services.filter((s) => s.active).length, 0);
  return (
    <>
      <PageHeader title="Services & Pricing" subtitle={`${plural(count, 'service')} in ${plural(categories.length, 'category', 'categories')}. Prices are before GST, which is set in Settings.`} />
      <ServiceManager categories={categories} editable={canEdit(user.role, 'services')} />
    </>
  );
}
