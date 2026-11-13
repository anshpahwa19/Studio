import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Anything under /api that no endpoint owns gets a JSON 404 instead of an HTML page.
const notFound = () => NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
