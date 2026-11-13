'use client';
// Browser side of the API. Every screen saves through these calls; nothing in the browser touches the database.

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export async function call<T = undefined>(method: string, path: string, body?: unknown): Promise<Result<T>> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  try {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined || isForm ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    return (await res.json()) as Result<T>;
  } catch {
    return { ok: false, error: 'Could not reach the app server. Check that it is running.' };
  }
}

/** The data a service function returns on success, so client wrappers keep the same types. */
export type DataOf<F> = F extends (...a: never[]) => Promise<{ ok: true; data?: infer T } | { ok: false; error: string }> ? T : never;
