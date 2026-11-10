'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { endSession, startSession } from '@/lib/session';

export async function signIn(_: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return 'Enter your email and password.';
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return 'That email and password do not match.';
  if (!user.active) return 'This login has been switched off. Ask the owner to turn it back on.';
  startSession(user.id);
  redirect('/dashboard');
}

export async function signOut() {
  endSession();
  redirect('/login');
}
