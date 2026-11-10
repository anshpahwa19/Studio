import { db } from '@/lib/db';
import { requirePage } from '@/lib/session';
import { canEdit } from '@/lib/roles';
import { PageHeader } from '@/components/ui';
import { plural } from '@/lib/format';
import { ServiceManager } from './service-manager';

export default async function ServicesPage() {
  const user = await requirePage('services');
  const [categories, settings] = await Promise.all([
    db.serviceCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { services: { where: { active: true }, orderBy: { name: 'asc' } } },
    }),
    db.settings.findUnique({ where: { id: 1 } }),
  ]);
  const count = categories.reduce((a, c) => a + c.services.length, 0);
  return (
    <>
      <PageHeader title="Services" subtitle={`${plural(count, 'service')} in ${plural(categories.length, 'category', 'categories')}. Prices are before GST.`} />
      <ServiceManager categories={categories} editable={canEdit(user.role, 'services')} defaultTax={settings?.defaultTaxRate ?? 18} />
    </>
  );
}
