import 'server-only';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ActionError } from '@/server/auth/session';

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; status?: number };

/** Runs a server action body and turns expected failures into a message for the form. */
export async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message, status: e.status };
    if (e instanceof ZodError) {
      const issue = e.issues[0];
      const field = issue.path.join('.');
      return { ok: false, error: field ? `${label(field)}: ${issue.message}` : issue.message, status: 422 };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = String((e.meta?.target as string[] | undefined)?.join(', ') ?? 'value');
      return { ok: false, error: `That ${label(target)} is already in use.`, status: 409 };
    }
    console.error(e);
    return { ok: false, error: 'Something went wrong while saving. Try again.', status: 500 };
  }
}

const label = (s: string) => s.replace(/([A-Z])/g, ' $1').replace(/\.\d+\./g, ' ').toLowerCase();
