// Shared by every route.ts under src/app/api. The folder starts with "_" so Next never treats it as a URL.
import 'server-only';
import { NextResponse } from 'next/server';
import type { Result } from '@/server/api/attempt';

/** What an endpoint receives: URL parts (p), ?query values (q), the JSON body (b, or {}), the form for uploads, and the raw request. */
type Ctx = { p: Record<string, string>; q: URLSearchParams; b: any; form: FormData | null; req: Request };

/** Most endpoints answer with a Result; downloads (CSV, bill files) answer with a Response. */
type Handler = (c: Ctx) => Promise<Result<any> | Response>;

/**
 * Turns an endpoint function into a Next route handler: reads the JSON or upload, runs it, and sends
 * { ok: true, data } or { ok: false, error } with the right HTTP status. CORS is added by src/middleware.ts.
 */
export function route(run: Handler) {
  return async (req: Request, { params }: { params: Record<string, string> }) => {
    let b: any = {};
    let form: FormData | null = null;
    const type = req.headers.get('content-type') ?? '';
    try {
      if (type.includes('multipart/form-data')) form = await req.formData();
      else if (type.includes('json')) b = (await req.json()) ?? {};
    } catch {
      return NextResponse.json({ ok: false, error: 'The request body could not be read.' }, { status: 400 });
    }
    const result = await run({ p: params ?? {}, q: new URL(req.url).searchParams, b, form, req });
    if (result instanceof Response) return result;
    const { status, ...body } = result as typeof result & { status?: number };
    return NextResponse.json(body, { status: result.ok ? 200 : status ?? 400 });
  };
}

/** A form built from JSON, so uploads and plain JSON bodies reach the same code. */
export function toForm(b: Record<string, unknown>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(b ?? {})) if (v !== undefined && v !== null) f.set(k, String(v));
  return f;
}

export function withId(f: FormData, id: string) {
  f.set('id', id);
  return f;
}
