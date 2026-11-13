import { route } from '@/app/api/_lib/handler';
import { GET as customerExport } from '@/server/features/customers/export';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = route(({ req }) => customerExport(req as NextRequest));
