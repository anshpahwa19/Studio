import { db } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { canView } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** Serves the uploaded copy of a supplier bill. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || !canView(user.role, 'suppliers')) return new Response('Not allowed', { status: 403 });
  const b = await db.supplierBill.findUnique({ where: { id: params.id }, select: { fileName: true, fileType: true, fileData: true } });
  if (!b?.fileData || !b.fileType) return new Response('No file', { status: 404 });
  return new Response(new Uint8Array(b.fileData), {
    headers: {
      'Content-Type': b.fileType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(b.fileName ?? 'bill')}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
