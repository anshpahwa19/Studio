import { redirect } from 'next/navigation';
import { CalendarDays, Receipt, Scissors, Users } from 'lucide-react';
import { currentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await currentUser()) redirect('/dashboard');
  const settings = await db.settings.findUnique({ where: { id: 1 } });
  const points = [
    [CalendarDays, 'Appointments and stylist rosters'],
    [Receipt, 'GST billing, split payments and dues'],
    [Users, 'Client profiles with hair and nail notes'],
  ] as const;
  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><Scissors size={21} /></span>
          <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-violet-100">Salon Management</span>
        </div>
        <div>
          <h1 className="text-[40px] font-bold leading-[1.15] tracking-tight">{settings?.name ?? 'Your salon'}</h1>
          <ul className="mt-8 space-y-4">
            {points.map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-violet-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20"><Icon size={18} /></span>{text}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-[13px] text-violet-200">{settings?.address}</div>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 right-10 h-80 w-80 rounded-full bg-violet-400/20" />
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="card w-full max-w-md p-8 sm:p-10">
          <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white lg:hidden"><Scissors size={22} /></span>
          <h2 className="text-[26px] font-bold tracking-tight">Welcome back</h2>
          <p className="mb-7 mt-1 text-ink-soft">Sign in with the login the salon owner gave you.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
