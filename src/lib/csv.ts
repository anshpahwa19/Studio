/** Reads CSV text (quoted cells, commas and line breaks inside quotes, BOM) into rows of cells. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Quotes a cell for CSV, and stops spreadsheet apps from treating text like "=..." as a formula. */
export function csvCell(v: string | number): string {
  if (typeof v === 'number') return String(v);
  const s = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\r\n']/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
