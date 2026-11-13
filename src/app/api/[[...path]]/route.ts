import { NextResponse } from 'next/server';
import { match } from '@/server/api/routes';

export const dynamic = 'force-dynamic';

// Websites on other domains may call the API only if listed in ALLOWED_ORIGINS (comma separated, e.g.
// "https://book.example.com"). They sign in with the bearer token; cookies are never shared across sites.
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  if (!origin || !(allowed.includes('*') || allowed.includes(origin))) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

async function handle(req: Request, { params }: { params: { path?: string[] } }) {
  const cors = corsHeaders(req);
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: cors });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const found = match(req.method, params.path ?? []);
  if (found === null) return json({ ok: false, error: 'Not found.' }, 404);
  if (found === 'method') return json({ ok: false, error: 'Method not allowed.' }, 405);

  let b: any = {};
  let form: FormData | null = null;
  const type = req.headers.get('content-type') ?? '';
  try {
    if (type.includes('multipart/form-data')) form = await req.formData();
    else if (type.includes('json')) b = (await req.json()) ?? {};
  } catch {
    return json({ ok: false, error: 'The request body could not be read.' }, 400);
  }

  const result = await found.run({ p: found.p, q: new URL(req.url).searchParams, b, form, req });
  if (result instanceof Response) {
    for (const [k, v] of Object.entries(cors)) result.headers.set(k, v);
    return result;
  }
  const { status, ...body } = result as typeof result & { status?: number };
  return json(body, result.ok ? 200 : status ?? 400);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
