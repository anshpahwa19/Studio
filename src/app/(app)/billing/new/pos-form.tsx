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
import { saveCustomer } from '../../customers/actions';

export type PosLine = { key: string; kind: 'service' | 'product'; refId: string; name: string; qty: number; unitPrice: number; staffId: string | null };
type Pay = { amount: string; method: (typeof PAYMENT_METHODS)[number]; reference: string };

type Props = {
  gstRate: number;
  customers: { id: string; name: string; phone: string }[];
  services: { id: string; name: string; price: number }[];
  products: { id: string; name: string; price: number; stock: number; sku: string | null }[];
  staff: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  initial: { customerId: string; branchId: string; lines: PosLine[]; appointmentId: string | null };
};

export function PosForm({ gstRate, customers: initialCustomers, services, products, staff, branches, initial }: Props) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [newClient, setNewClient] = useState<{ name: string; phone: string } | null>(null);
  const [withGst, setWithGst] = useState(true);
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

  const rate = withGst ? gstRate : 0;
  const bill = computeBill(lines.map((l) => ({ ...l, taxRate: rate })), { type: discType, value: Number(discValue) || 0 });
  const customer = customers.find((c) => c.id === customerId);
  const payments = autoPay ? [{ ...pays[0], amount: String(bill.total) }, ...pays.slice(1)] : pays;
  const paid = round2(payments.reduce((a, p) => a + (Number(p.amount) || 0), 0));
  const due = round2(bill.total - paid);

  const cMatches = useMemo(() => {
    const t = cq.trim().toLowerCase();
    return t ? customers.filter((c) => c.name.toLowerCase().includes(t) || c.phone.replace(/\s/g, '').includes(t.replace(/\s/g, ''))).slice(0, 6) : [];
  }, [cq, customers]);
  const catalog: { id: string; name: string; price: number; stock: number | null; sku: string | null }[] =
    tab === 'service' ? services.map((s) => ({ ...s, stock: null, sku: null })) : products;
  const items = catalog.filter((x) => `${x.name} ${x.sku ?? ''}`.toLowerCase().includes(iq.toLowerCase()));

  const add = (kind: 'service' | 'product', x: { id: string; name: string; price: number }) => {
    const existing = kind === 'product' && lines.find((l) => l.kind === 'product' && l.refId === x.id);
    if (existing) return setLines(lines.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l)));
    setLines([...lines, { key: `${Date.now()}${Math.random()}`, kind, refId: x.id, name: x.name, qty: 1, unitPrice: x.price, staffId: null }]);
  };
  const update = (key: string, patch: Partial<PosLine>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function save() {
    let cid = customerId;
    if (newClient) {
      const c = await run(() => saveCustomer(newClient), 'Client added');
      if (!c) return;
      setCustomers([...customers, c]);
      setCustomerId(c.id);
      setNewClient(null);
      cid = c.id;
    }
    const r = await run(() => createInvoice({
      customerId: cid, withGst, branchId: branchId || null, appointmentId: initial.appointmentId, notes,
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
              {newClient ? (
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-line p-3">
                  <Input placeholder="Full name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} aria-label="New client name" autoFocus />
                  <Input placeholder="Mobile number" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} aria-label="New client mobile" />
                  <p className="col-span-2 text-[12px] text-ink-mute">The client is saved when you save the bill.</p>
                  <button type="button" onClick={() => setNewClient(null)} className="col-span-2 text-left text-[12.5px] text-plum-600 hover:underline">Choose an existing client instead</button>
                </div>
              ) : customer ? (
                <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                  <div><div className="font-medium">{customer.name}</div><div className="text-[12.5px] text-ink-mute">{customer.phone}</div></div>
                  {!initial.appointmentId && <Button size="sm" variant="ghost" onClick={() => setCustomerId('')}>Change</Button>}
                </div>
              ) : (
                <div className="relative">
                  <Input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Search name or mobile" aria-label="Search clients" />
                  {cq.trim() && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-lg">
                      {cMatches.map((c) => (
                        <li key={c.id}><button type="button" onClick={() => { setCustomerId(c.id); setCq(''); }} className="w-full px-3 py-2 text-left hover:bg-canvas"><span className="font-medium">{c.name}</span> <span className="text-ink-mute">{c.phone}</span></button></li>
                      ))}
                      <li>
                        <button type="button" className="w-full border-t border-line px-3 py-2 text-left font-medium text-plum-600 hover:bg-canvas"
                          onClick={() => { const digits = /\d{4,}/.test(cq); setNewClient({ name: digits ? '' : cq.trim(), phone: digits ? cq.trim() : '' }); setCq(''); }}>
                          + Add &quot;{cq.trim()}&quot; as a new client
                        </button>
                      </li>
                    </ul>
                  )}
                  {!cq && <button type="button" onClick={() => setNewClient({ name: '', phone: '' })} className="mt-1 text-[12.5px] font-medium text-plum-600 hover:underline">+ New client</button>}
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
                      <td><div className="font-medium">{l.name}</div><div className="text-[12px] text-ink-mute">{l.kind === 'service' ? 'Service' : 'Product'}</div></td>
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
            <label className="flex items-center justify-between gap-2 border-t border-line pt-2">
              <span className="flex items-center gap-2">
                <input id="with-gst" type="checkbox" checked={withGst} onChange={(e) => setWithGst(e.target.checked)} className="h-4 w-4 accent-plum-600" />
                <span className="text-ink-soft">Charge GST ({gstRate}%)</span>
              </span>
              <span className="tabular">{withGst ? money(bill.tax) : 'No GST'}</span>
            </label>
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
        <Button className="w-full py-2.5" disabled={pending || (!customerId && !newClient) || !lines.length || due < -0.005} onClick={save}>{pending ? 'Saving…' : `Save bill · ${money(bill.total)}`}</Button>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between"><span className="text-ink-soft">{label}</span><span className="tabular">{value}</span></div>
);
