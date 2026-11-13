import { route } from '@/app/api/_lib/handler';
import { GET as billFile } from '@/server/features/suppliers/bill-file';

export const dynamic = 'force-dynamic';

export const GET = route(({ p, req }) => billFile(req, { params: { id: p.id } }));
