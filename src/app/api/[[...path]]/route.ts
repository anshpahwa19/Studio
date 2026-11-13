import { NextResponse } from 'next/server';
import { match } from '@/lib/api-routes';

export const dynamic = 'force-dynamic';

async function handle(req: Request, { params }: { params: { path?: string[] } }) {
  const found = match(req.method, params.path ?? []);
  if (found === null) return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
  if (found === 'method') return NextResponse.json({ ok: false, error: 'Method not allowed.' }, { status: 405 });

  let b: any = {};
  let form: FormData | null = null;
  const type = req.headers.get('content-type') ?? '';
  try {
    if (type.includes('multipart/form-data')) form = await req.formData();
    else if (type.includes('json')) b = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ ok: false, error: 'The request body could not be read.' }, { status: 400 });
  }

  const result = await found.run({ p: found.p, q: new URL(req.url).searchParams, b, form, req });
  if (result instanceof Response) return result;
  const { status, ...body } = result as typeof result & { status?: number };
  return NextResponse.json(body, { status: result.ok ? 200 : status ?? 400 });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
