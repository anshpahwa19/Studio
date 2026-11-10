import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await currentUser()) redirect('/dashboard');
  const settings = await db.settings.findUnique({ where: { id: 1 } });
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-plum-700 p-12 text-white lg:flex">
        <div className="text-[13px] uppercase tracking-[0.2em] text-plum-100">Salon Studio</div>
        <div>
          <h1 className="font-display text-[44px] leading-[1.1]">{settings?.name ?? 'Your salon'}</h1>
          <p className="mt-4 max-w-md text-plum-100">Appointments, billing, clients and stock for the front desk and the owner, in one place.</p>
        </div>
        <div className="text-[12.5px] text-plum-200">{settings?.address}</div>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -right-8 top-40 h-64 w-64 rounded-full border border-brass-500/40" />
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-[30px]">Sign in</h2>
          <p className="mb-6 mt-1 text-ink-mute">Use the login the salon owner gave you.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
