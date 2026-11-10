import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
export { Select } from './select';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-plum-600 text-white hover:bg-plum-700 border-plum-600',
  secondary: 'bg-white text-ink border-line hover:bg-canvas',
  ghost: 'bg-transparent text-ink-soft border-transparent shadow-none hover:bg-stone-100 hover:text-ink',
  danger: 'bg-white text-red-700 border-red-200 hover:bg-red-50',
};

export function Button({ variant = 'primary', size = 'md', className, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1 text-[12.5px]' : 'px-4 py-2 text-[14px]',
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

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <div className="mt-1 text-[14.5px] text-ink-soft">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className, pad = true }:
  { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
            {subtitle && <p className="text-[13px] text-ink-mute">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={pad ? 'p-6' : ''}>{children}</div>
    </section>
  );
}

const iconTiles = {
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  blue: 'bg-sky-50 text-sky-600 ring-sky-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  red: 'bg-rose-50 text-rose-600 ring-rose-100',
  teal: 'bg-teal-50 text-teal-600 ring-teal-100',
} as const;
export type IconTone = keyof typeof iconTiles;

/** Rounded square tile holding an icon, coloured by tone. */
export function IconTile({ tone = 'violet', children, size = 'md' }: { tone?: IconTone; children: ReactNode; size?: 'md' | 'lg' }) {
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-xl ring-1', size === 'lg' ? 'h-12 w-12' : 'h-10 w-10', iconTiles[tone])}>
      {children}
    </span>
  );
}

const pills = {
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  gray: 'bg-stone-100 text-stone-600 ring-stone-200',
} as const;

/** Small uppercase label pill, e.g. LIVE TODAY or RECEIVABLES. */
export function Pill({ tone = 'gray', children }: { tone?: keyof typeof pills; children: ReactNode }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset', pills[tone])}>{children}</span>;
}

/** Metric card: label and pill on top, big number with an icon tile, and a footer note. */
export function Stat({ label, value, note, tone, icon, iconTone, pill, pillTone }: {
  label: string; value: ReactNode; note?: ReactNode; tone?: 'warn' | 'good';
  icon?: ReactNode; iconTone?: IconTone; pill?: string; pillTone?: keyof typeof pills;
}) {
  return (
    <div className="card flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-soft">{label}</div>
        {pill && <Pill tone={pillTone}>{pill}</Pill>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className={cx('tabular text-[30px] font-bold leading-none tracking-tight', tone === 'warn' ? 'text-amber-700' : tone === 'good' ? 'text-emerald-700' : 'text-ink')}>{value}</div>
        {icon && <IconTile tone={iconTone}>{icon}</IconTile>}
      </div>
      {note && <div className="mt-5 border-t border-line pt-3 text-[13px] text-ink-soft">{note}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 text-ink-mute">{children}</div>}
    </div>
  );
}

const tones = {
  plum: 'bg-violet-50 text-violet-700 ring-violet-200',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  gray: 'bg-stone-100 text-stone-600 ring-stone-200',
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset', tones[tone])}>{children}</span>;
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
