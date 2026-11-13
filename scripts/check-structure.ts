// Keeps the folder structure honest. Run by `npm run check`. See "Folder structure" in README.md.
//
//   src/app         screens, and src/app/api: every HTTP endpoint, one route.ts per URL. Screens show data from
//                   the API and never touch the database; endpoints call src/server and never touch it directly.
//   src/components  shared UI pieces used by screens (browser code).
//   src/client      browser-only helpers: client/api/* are the calls screens make to the endpoints, session.ts.
//   src/lib         plain helpers safe in both places (formatting, validation, roles, bill maths).
//   src/server      the backend: database, sign-in, API routes, and one folder per feature.
import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, normalize, relative, sep } from 'path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const TOP = ['app', 'client', 'components', 'lib', 'server'];
const problems: string[] = [];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

type Imp = { spec: string; type: boolean };
function importsOf(text: string): Imp[] {
  const out: Imp[] = [];
  const re = /(?:^|\n)\s*(import|export)\s+(type\s+)?([^'";]*?)\s*(?:from\s*)?['"]([^'"]+)['"]/g;
  for (const m of text.matchAll(re)) {
    const [, kw, typeKw, clause, spec] = m;
    if (kw === 'export' && !/from/.test(m[0])) continue;
    const braces = clause.match(/^\{([\s\S]*)\}$/)?.[1];
    const allTypes = braces !== undefined && braces.split(',').map((s) => s.trim()).filter(Boolean).every((s) => s.startsWith('type '));
    out.push({ spec, type: !!typeKw || allTypes });
  }
  return out;
}

/** Where an import points, as a path under src/ (e.g. "server/db"), or null for packages. */
function target(spec: string, file: string): string | null {
  if (spec.startsWith('@/')) return spec.slice(2);
  if (spec.startsWith('.')) return relative(SRC, normalize(join(dirname(file), spec))).split(sep).join('/');
  return null;
}

const area = (p: string) => p.split('/')[0];
const inServer = (t: string) => t === 'server' || t.startsWith('server/');

for (const name of readdirSync(SRC)) {
  if (statSync(join(SRC, name)).isDirectory() && !TOP.includes(name)) problems.push(`src/${name}/ is not one of: ${TOP.join(', ')}. Put it in the right one of those.`);
}

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split(sep).join('/');
  const text = readFileSync(file, 'utf8');
  const top = area(rel);
  const isClientFile = /^\s*(['"])use client\1/.test(text);
  const bad = (msg: string) => problems.push(`src/${rel}: ${msg}`);

  if (rel.startsWith('app/api/')) {
    const name = rel.split('/').pop()!;
    const isLib = rel.startsWith('app/api/_lib/');
    if (!isLib && name !== 'route.ts') bad(`only route.ts files belong under app/api (one per URL). Shared code goes in app/api/_lib/, logic in server/.`);
    if (isLib && name === 'route.ts') bad(`rename it: Next treats any route.ts as an endpoint, even in _lib.`);
    if (!isLib && !/export const dynamic = 'force-dynamic'/.test(text) && !rel.includes('[...path]')) bad(`add export const dynamic = 'force-dynamic'; so the answer is never cached.`);
  }

  if (top === 'server' && rel !== 'server/db.ts' && !/import\s+['"]server-only['"]/.test(text)) bad(`add import 'server-only'; at the top so it can never be bundled into the browser.`);

  for (const { spec, type } of importsOf(text)) {
    const t = target(spec, file);
    const pkg = t === null ? spec : '';
    const where = `imports '${spec}'`;

    if (top === 'lib') {
      if (t && ['server', 'client', 'components', 'app'].includes(area(t))) bad(`${where}. lib/ is shared by the browser and the server, so it cannot depend on ${area(t)}/.`);
      if (!type && (pkg === 'server-only' || pkg === 'next/headers' || pkg === '@prisma/client')) bad(`${where}. lib/ must stay plain; move server-only code to server/.`);
    }
    if ((top === 'client' || top === 'components' || isClientFile) && !type) {
      if (t && inServer(t)) bad(`${where}. Browser code cannot import server/ (only 'import type' is allowed). Call the API through client/api-client instead.`);
      if (pkg === 'server-only' || pkg === 'next/headers' || pkg === '@prisma/client') bad(`${where}. That is server-only.`);
    }
    if (top === 'server' && t && ['client', 'components', 'app'].includes(area(t))) bad(`${where}. server/ cannot depend on ${area(t)}/.`);
    if (rel.startsWith('app/api/') && !type) {
      if (pkg === '@prisma/client' || t === 'server/db') bad(`${where}. Endpoints call a feature's service.ts or queries.ts; only src/server uses the database.`);
    } else if (top === 'app' && !type) {
      if (pkg === '@prisma/client') bad(`${where}. Screens never use the database; read data with api() from server/api/fetch.`);
      if (t && inServer(t)) {
        const ok = t === 'server/api/fetch' || t === 'server/auth/session' || (rel.startsWith('app/api/') && t === 'server/api/routes');
        if (!ok) bad(`${where}. Screens may only use server/api/fetch and server/auth/session. Everything else is reached through the API.`);
      }
    }
  }
}

if (problems.length) {
  console.error(`Folder structure problems (${problems.length}):\n  ` + problems.join('\n  ') + '\n\nThe rules are in README.md under "Folder structure".');
  process.exit(1);
}
console.log('Folder structure ok.');
