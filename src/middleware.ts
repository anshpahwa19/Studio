import { NextResponse, type NextRequest } from 'next/server';

export const config = { matcher: '/api/:path*' };

// Websites on other domains may call the API only if listed in ALLOWED_ORIGINS (comma separated, e.g.
// "https://book.example.com"). They sign in with the bearer token; cookies are never shared across sites.
export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  const ok = !!origin && (allowed.includes('*') || allowed.includes(origin));
  const cors: Record<string, string> = ok
    ? { 'Access-Control-Allow-Origin': origin!, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' }
    : {};
  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: cors });
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}
