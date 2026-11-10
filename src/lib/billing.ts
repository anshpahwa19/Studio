import { round2 } from './format';

// Bill maths, used by the POS screen for the live total and by the server when saving.
// Prices are before GST. A bill discount is shared across lines in proportion to their value,
// and GST is charged on each line after its share of the discount.

export type LineInput = { qty: number; unitPrice: number; taxRate: number };
export type Discount = { type: 'percent' | 'amount' | null; value: number };

export function computeBill(lines: LineInput[], discount: Discount) {
  const gross = lines.map((l) => round2(l.qty * l.unitPrice));
  const subtotal = round2(gross.reduce((a, b) => a + b, 0));

  let totalDiscount = 0;
  if (discount.type === 'percent') totalDiscount = (subtotal * Math.min(Math.max(discount.value, 0), 100)) / 100;
  if (discount.type === 'amount') totalDiscount = Math.min(Math.max(discount.value, 0), subtotal);
  totalDiscount = round2(totalDiscount);

  let allocated = 0;
  const computed = lines.map((l, i) => {
    const isLast = i === lines.length - 1;
    const share = subtotal > 0 ? (isLast ? round2(totalDiscount - allocated) : round2((totalDiscount * gross[i]) / subtotal)) : 0;
    allocated = round2(allocated + share);
    const taxable = round2(gross[i] - share);
    const tax = round2((taxable * l.taxRate) / 100);
    return { ...l, gross: gross[i], discount: share, tax, total: round2(taxable + tax) };
  });

  const tax = round2(computed.reduce((a, l) => a + l.tax, 0));
  const total = round2(subtotal - totalDiscount + tax);
  return { lines: computed, subtotal, discount: totalDiscount, tax, total };
}

export function invoiceStatus(total: number, paid: number) {
  if (paid <= 0) return total <= 0 ? 'Paid' : 'Unpaid';
  return paid + 0.005 >= total ? 'Paid' : 'Partial';
}
