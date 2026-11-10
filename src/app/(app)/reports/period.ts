import { addDays, isoDate, monthEnd, monthStart, weekStart } from '@/lib/format';

export const PRESETS = { today: 'Today', week: 'This week', month: 'This month', lastmonth: 'Last month', year: 'This year' } as const;

export function resolvePeriod(p: { period?: string; from?: string; to?: string }) {
  const today = isoDate();
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (valid(p.from) && valid(p.to) && p.from! <= p.to!) return { key: 'custom', from: p.from!, to: p.to! };
  switch (p.period) {
    case 'today': return { key: 'today', from: today, to: today };
    case 'week': return { key: 'week', from: weekStart(today), to: addDays(weekStart(today), 6) };
    case 'lastmonth': { const s = monthStart(addDays(monthStart(today), -1)); return { key: 'lastmonth', from: s, to: monthEnd(s) }; }
    case 'year': return { key: 'year', from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    default: return { key: 'month', from: monthStart(today), to: monthEnd(today) };
  }
}

export const range = (from: string, to: string) => ({ gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59.999`) });
