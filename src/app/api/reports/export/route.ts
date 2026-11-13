import { route } from '@/app/api/_lib/handler';
import { GET as reportExport } from '@/server/features/reports/export';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = route(({ req }) => reportExport(req as NextRequest));
