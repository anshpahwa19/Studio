'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button, Card, Field, Input, Select, Textarea, cx } from '@/components/ui';
import { useAction } from '@/components/use-action';
import { computeBill } from '@/lib/billing';
import { money, round2 } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/validate';
import { createInvoice } from '../actions';

export type PosLine = { key: string; kind: 'service' | 'product'; refId: string; name: string; qty: number; unitPrice: number; taxRate: number; staffId: string | null };
type Pay = { amount: string; method: (typeof PAYMENT_METHODS)[number]; reference: string };

type Props = {
  customers: { id: string; name: string; phone: string }[];
  services: { id: string; name: string; price: number; taxRate: number }[];
  products: { id: string; name: string; price: number; taxRate: number; stock: number; sku: string | null }[];
  staff: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  initial: { customerId: string; branchId: string; lines: PosLine[]; appointmentId: string | null };
};

export function PosForm({ customers, services, products, staff, branches, initial }: Props) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [cq, setCq] = useState('');
  const [branchId, setBranchId] = useState(initial.branchId);
  const [lines, setLines] = useState<PosLine[]>(initial.lines);
  const [tab, setTab] = useState<'service' | 'product'>('service');
  const [iq, setIq] = useState('');
  const [discType, setDiscType] = useState<'percent' | 'amount' | null>(null);
  const [discValue, setDiscValue] = useState('');
  const [pays, setPays] = useState<Pay[]>([{ amount: '', method: 'UPI', reference: '' }]);
  const [autoPay, setAutoPay] = useState(true);
  const [notes, setNotes] = useState('');

  const bill = computeBill(lines, { type: discType, value: Number(discValue) || 0 });
  const customer = customers.find((c) => c.id === customerId);
  const payments = autoPay ? [{ ...pays[0], amount: String(bill.total) }, ...pays.slice(1)] : pays;
  const paid = round2(payments.reduce((a, p) => a + (Number(p.amount) || 0), 0));
  const due = round2(bill.total - paid);

  const cMatches = useMemo(() => {
    const t = cq.trim().toLowerCase();
    return t ? customers.filter((c) => c.name.toLowerCase().includes(t) || c.phone.replace(/\s/g, '').includes(t.replace(/\s/g, ''))).slice(0, 6) : [];
  }, [cq, customers]);
  const catalog: { id: string; name: string; price: number; taxRate: number; stock: number | null; sku: string | null }[] =
    tab === 'service' ? services.map((s) => ({ ...s, stock: null, sku: null })) : products;
  const items = catalog.filter((x) => `${x.name} ${x.sku ?? ''}`.toLowerCase().includes(iq.toLowerCase()));

  const add = (kind: 'service' | 'product', x: { id: string; name: string; price: number; taxRate: number }) => {
    const existing = kind === 'product' && lines.find((l) => l.kind === 'product' && l.refId === x.id);
    if (existing) return setLines(lines.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l)));
    setLines([...lines, { key: `${Date.now()}${Math.random()}`, kind, refId: x.id, name: x.name, qty: 1, unitPrice: x.price, taxRate: x.taxRate, staffId: null }]);
  };
  const update = (key: string, patch: Partial<PosLine>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function save() {
    const r = await run(() => createInvoice({
      customerId, branchId: branchId || null, appointmentId: initial.appointmentId, notes,
      lines: lines.map((l) => ({ kind: l.kind, refId: l.refId, staffId: l.staffId, qty: l.qty, unitPrice: l.unitPrice })),
      discountType: discType, discountValue: Number(discValue) || 0,
      payments: payments.map((p) => ({ amount: Number(p.amount) || 0, method: p.method, reference: p.reference })),
    }), 'Bill saved');
    if (r) router.push(`/billing/${r.id}`);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <Card title="Client and branch">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="label">Client</span>
              {customer ? (
                <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                  <div><div className="font-medium">{customer.name}</div><div className="text-[12.5px] text-ink-mute">{customer.phone}</div></div>
                  {!initial.appointmentId && <Button size="sm" variant="ghost" onClick={() => setCustomerId('')}>Change</Button>}
                </div>
              ) : (
                <div className="relative">
                  <Input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Search name or mobile" aria-label="Search clients" />
                  {cMatches.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-lg">
                      {cMatches.map((c) => (
                        <li key={c.id}><button type="button" onClick={() => { setCustomerId(c.id); setCq(''); }} className="w-full px-3 py-2 text-left hover:bg-canvas"><span className="font-medium">{c.name}</span> <span className="text-ink-mute">{c.phone}</span></button></li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1 text-[12px] text-ink-mute">New client? Add them on the Clients page first.</p>
                </div>
              )}
            </div>
            {branches.length > 0 && (
              <Field label="Branch"><Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            )}
          </div>
        </Card>

        <Card title="Items" pad={false}>
          {lines.length === 0 ? <p className="px-5 py-6 text-ink-mute">Add services or products from the list below.</p> : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Item</th><th>Done by</th><th className="w-20">Qty</th><th className="w-28">Price (₹)</th><th className="text-right">Amount</th><th /></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.key}>
                      <td><div className="font-medium">{l.name}</div><div className="text-[12px] text-ink-mute">{l.kind === 'service' ? 'Service' : 'Product'} · GST {l.taxRate}%</div></td>
                      <td>
                        {l.kind === 'service' ? (
                          <Select value={l.staffId ?? ''} onChange={(e) => update(l.key, { staffId: e.target.value || null })} aria-label="Done by" className="min-w-[140px] py-1.5">
                            <option value="">Not set</option>
                            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </Select>
                        ) : <span className="text-ink-mute">—</span>}
                      </td>
                      <td><Input type="number" min={1} value={l.qty} onChange={(e) => update(l.key, { qty: Math.max(1, parseInt(e.target.value) || 1) })} className="py-1.5" aria-label="Quantity" /></td>
                      <td><Input type="number" min={0} step="1" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} className="py-1.5" aria-label="Unit price" /></td>
                      <td className="tabular text-right">{money(bill.lines[i]?.total ?? 0)}</td>
                      <td><button type="button" aria-label={`Remove ${l.name}`} onClick={() => setLines(lines.filter((x) => x.key !== l.key))} className="rounded p-1 text-ink-mute hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-line p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-line p-0.5">
                {(['service', 'product'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={cx('rounded-md px-3 py-1 text-[13px] font-medium', tab === t ? 'bg-plum-600 text-white' : 'text-ink-soft')}>{t === 'service' ? 'Services' : 'Products'}</button>
                ))}
              </div>
              <Input value={iq} onChange={(e) => setIq(e.target.value)} placeholder={tab === 'service' ? 'Find a service' : 'Find a product or SKU'} className="max-w-xs flex-1" aria-label="Find item" />
            </div>
            <div className="grid max-h-64 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {items.map((x) => {
                                return (
                  <button key={x.id} type="button" onClick={() => add(tab, x)} disabled={x.stock === 0}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-left text-[13px] hover:border-plum-200 hover:bg-plum-50 disabled:opacity-40">
                    <span className="min-w-0"><span className="block truncate font-medium">{x.name}</span>{x.stock !== null && <span className="text-[11.5px] text-ink-mute">{x.stock} in stock</span>}</span>
                    <span className="tabular shrink-0">{money(x.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6">
        <Card title="Summary">
          <div className="space-y-2 text-[13.5px]">
            <Row label="Subtotal" value={money(bill.subtotal)} />
            <div className="flex items-center gap-2">
              <Select value={discType ?? ''} onChange={(e) => setDiscType((e.target.value || null) as typeof discType)} className="w-36 py-1.5" aria-label="Discount type">
                <option value="">No discount</option><option value="percent">Discount %</option><option value="amount">Discount ₹</option>
              </Select>
              {discType && <Input type="number" min={0} value={discValue} onChange={(e) => setDiscValue(e.target.value)} className="py-1.5" aria-label="Discount value" />}
            </div>
            {bill.discount > 0 && <Row label="Discount" value={`− ${money(bill.discount)}`} />}
            <Row label="GST" value={money(bill.tax)} />
            <div className="flex justify-between border-t border-line pt-2 text-[17px] font-semibold"><span>Total</span><span className="tabular">{money(bill.total)}</span></div>
          </div>
        </Card>
        <Card title="Payment">
          <div className="space-y-2">
            {payments.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_92px_auto] gap-2">
                <Input type="number" min={0} step="0.01" value={p.amount} aria-label="Amount"
                  onChange={(e) => { setAutoPay(false); setPays(payments.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x))); }} />
                <Select value={p.method} aria-label="Method" onChange={(e) => { setAutoPay(false); setPays(payments.map((x, j) => (j === i ? { ...x, method: e.target.value as Pay['method'] } : x))); }}>
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </Select>
                <button type="button" aria-label="Remove payment" disabled={payments.length === 1}
                  onClick={() => { setAutoPay(false); setPays(payments.filter((_, j) => j !== i)); }} className="rounded p-1 text-ink-mute hover:text-red-700 disabled:invisible"><Trash2 size={15} /></button>
                <Input value={p.reference} placeholder="Reference (optional)" aria-label="Reference" className="col-span-2 py-1.5 text-[12.5px]"
                  onChange={(e) => { setAutoPay(false); setPays(payments.map((x, j) => (j === i ? { ...x, reference: e.target.value } : x))); }} />
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={() => { setAutoPay(false); setPays([...payments, { amount: String(Math.max(0, due)), method: 'Cash', reference: '' }]); }}>Split payment</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAutoPay(false); setPays([{ amount: '0', method: 'Cash', reference: '' }]); }}>Nothing paid now</Button>
            </div>
            <div className={cx('mt-2 flex justify-between rounded-lg px-3 py-2 text-[13.5px] font-medium', due > 0.005 ? 'bg-amber-50 text-amber-800' : due < -0.005 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800')}>
              <span>{due > 0.005 ? 'Balance due' : due < -0.005 ? 'Paid more than total' : 'Fully paid'}</span><span className="tabular">{money(Math.abs(due))}</span>
            </div>
          </div>
        </Card>
        <Field label="Notes on the bill"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Button className="w-full py-2.5" disabled={pending || !customerId || !lines.length || due < -0.005} onClick={save}>{pending ? 'Saving…' : `Save bill · ${money(bill.total)}`}</Button>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between"><span className="text-ink-soft">{label}</span><span className="tabular">{value}</span></div>
);
