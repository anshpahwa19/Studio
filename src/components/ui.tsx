import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-plum-600 text-white hover:bg-plum-700 border-plum-600',
  secondary: 'bg-white text-ink border-line hover:bg-canvas',
  ghost: 'bg-transparent text-ink-soft border-transparent hover:bg-canvas hover:text-ink',
  danger: 'bg-white text-red-700 border-red-200 hover:bg-red-50',
};

export function Button({ variant = 'primary', size = 'md', className, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1 text-[12.5px]' : 'px-3.5 py-2 text-[13.5px]',
        variants[variant],
        className,
      )}
    />
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-ink-mute">{hint}</span>}
    </label>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx('input', p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={2} {...p} className={cx('input', p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx('input pr-8', p.className)} />;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, pad = true }:
  { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[14.5px] font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'warn' | 'good' }) {
  return (
    <div className="card px-5 py-4">
      <div className="text-[12px] font-medium uppercase tracking-wide text-ink-mute">{label}</div>
      <div className={cx('tabular mt-1.5 text-[24px] font-semibold', tone === 'warn' && 'text-amber-700', tone === 'good' && 'text-emerald-700')}>{value}</div>
      {note && <div className="mt-0.5 text-[12.5px] text-ink-mute">{note}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-ink-mute">{children}</div>}
    </div>
  );
}

const tones = {
  plum: 'bg-plum-50 text-plum-700 ring-plum-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  gray: 'bg-stone-100 text-stone-600 ring-stone-200',
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset', tones[tone])}>{children}</span>;
}

const APPT: Record<string, [Tone, string]> = {
  Booked: ['blue', 'Booked'], CheckedIn: ['amber', 'Checked in'], InService: ['plum', 'In service'],
  Completed: ['green', 'Completed'], Cancelled: ['gray', 'Cancelled'], NoShow: ['red', 'No-show'],
};
export const ApptStatus = ({ status }: { status: string }) => {
  const [tone, text] = APPT[status] ?? ['gray', status];
  return <Badge tone={tone}>{text}</Badge>;
};
export const apptLabel = (s: string) => APPT[s]?.[1] ?? s;

const INV: Record<string, Tone> = { Paid: 'green', Partial: 'amber', Unpaid: 'red', Void: 'gray' };
export const InvoiceStatus = ({ status }: { status: string }) => <Badge tone={INV[status]}>{status === 'Partial' ? 'Part paid' : status}</Badge>;
