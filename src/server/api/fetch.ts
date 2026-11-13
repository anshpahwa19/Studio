import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

// Dates travel as ISO text in JSON; turn them back into Date objects so pages can treat them as they always did.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const revive = (_: string, v: unknown) => (typeof v === 'string' && ISO.test(v) ? new Date(v) : v);

/** Where this request came from, so the page can call its own API. */
function origin() {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${h.get('x-forwarded-proto') ?? 'http'}://${host}`;
}

type Query = Record<string, string | number | boolean | null | undefined>;

/**
 * Reads data for a page from the app's own API (GET /api/...), signed in as the person viewing the page.
 * Pages show data from here and never query the database themselves.
 */
export async function api<T>(path: string, query?: Query): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, String(v));
  const res = await fetch(`${origin()}/api${path}${qs.size ? `?${qs}` : ''}`, { headers: { cookie: headers().get('cookie') ?? '', authorization: headers().get('authorization') ?? '' }, cache: 'no-store' });
  let body: { ok: true; data: T } | { ok: false; error: string };
  try {
    body = JSON.parse(await res.text(), revive);
  } catch {
    notFound(); // not an API answer, e.g. a page address that matches a file download
  }
  if (body.ok) return body.data;
  if (res.status === 401) redirect('/login');
  if (res.status === 403) redirect('/dashboard');
  if (res.status === 404) notFound();
  throw new Error(body.error);
}
