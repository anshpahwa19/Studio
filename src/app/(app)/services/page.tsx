import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canEdit } from '@/lib/roles';
import { PageHeader } from '@/components/ui';
import { plural } from '@/lib/format';
import { ServiceManager } from './service-manager';

export default async function ServicesPage() {
  const user = await requirePage('services');
  const categories = await db.serviceCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { services: { orderBy: { name: 'asc' } } },
  });
  const count = categories.reduce((a, c) => a + c.services.filter((s) => s.active).length, 0);
  return (
    <>
      <PageHeader title="Services & Pricing" subtitle={`${plural(count, 'service')} in ${plural(categories.length, 'category', 'categories')}. Prices are before GST, which is set in Settings.`} />
      <ServiceManager categories={categories} editable={canEdit(user.role, 'services')} />
    </>
  );
}
