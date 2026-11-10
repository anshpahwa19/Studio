// Formatting and date helpers shared by server and client code.

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const money = (n: number) => inr.format(n || 0);
export const money0 = (n: number) => inr0.format(Math.round(n || 0));
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, days: number) {
  const d = parseDate(s);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** Monday of the week containing the date. */
export function weekStart(s: string) {
  const d = parseDate(s);
  const shift = (d.getDay() + 6) % 7;
  return addDays(s, -shift);
}

export function monthStart(s: string) {
  return s.slice(0, 8) + '01';
}

export function monthEnd(s: string) {
  const d = parseDate(monthStart(s));
  return isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function dayOfWeek(s: string) {
  return parseDate(s).getDay();
}

export function fmtDate(s: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = typeof s === 'string' ? (s.length === 10 ? parseDate(s) : new Date(s)) : s;
  return d.toLocaleDateString('en-IN', opts);
}

export function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export function fmtTime(t: string) {
  const m = toMinutes(t);
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${pad(m % 60)} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "1 bill", "3 bills". */
export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
