'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Minus, Package, Plus, Receipt, Scissors, Search, ShoppingBag, Trash2, UserPlus } from 'lucide-react';
import { Button, Card, Field, Input, Select, Textarea, cx } from '@/components/ui';
import { ClientCombobox } from '@/components/client-combobox';
import { useAction } from '@/components/use-action';
import { computeBill } from '@/lib/billing';
import { fmtDuration, money, round2 } from '@/lib/format';
import { PAYMENT_METHODS, phoneProps } from '@/lib/validate';
import { createInvoice } from '../actions';
import { saveCustomer } from '../../customers/actions';

export type PosLine = { key: string; kind: 'service' | 'product'; refId: string; name: string; qty: number; unitPrice: number; staffId: string | null };
type Pay = { amount: string; method: (typeof PAYMENT_METHODS)[number]; reference: string };
type CatalogItem = { id: string; name: string; price: number; category: string; duration?: number; stock?: number; sku?: string | null };

type Props = {
  gstRate: number;
  customers: { id: string; name: string; phone: string }[];
  services: { id: string; name: string; price: number; duration: number; category: string }[];
  products: { id: string; name: string; price: number; stock: number; byBranch: Record<string, number>; sku: string | null; category: string; unit: string }[];
  staff: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  initial: { customerId: string; branchId: string; lines: PosLine[]; appointmentId: string | null };
};

export function PosForm({ gstRate, customers: initialCustomers, services, products: allProducts, staff, branches, initial }: Props) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [newClient, setNewClient] = useState<{ name: string; phone: string; gender: string } | null>(null);
  const [withGst, setWithGst] = useState(true);
  const [branchId, setBranchId] = useState(initial.branchId);
  const [lines, setLines] = useState<PosLine[]>(initial.lines);
  // Stock shown and allowed is what the chosen branch has on its shelf.
  const products = useMemo(() => allProducts.map((p) => ({ ...p, stock: branches.length ? p.byBranch[branchId] ?? 0 : p.stock })), [allProducts, branches.length, branchId]);
  const [tab, setTab] = useState<'service' | 'product'>('service');
  const [iq, setIq] = useState('');
  const [cat, setCat] = useState('All');
  const [discType, setDiscType] = useState<'percent' | 'amount' | null>(null);
  const [discValue, setDiscValue] = useState('');
  const [pays, setPays] = useState<Pay[]>([{ amount: '', method: 'UPI', reference: '' }]);
  const [autoPay, setAutoPay] = useState(true);
  const [notes, setNotes] = useState('');

  const rate = withGst ? gstRate : 0;
  const bill = computeBill(lines.map((l) => ({ ...l, taxRate: rate })), { type: discType, value: Number(discValue) || 0 });
  const payments = autoPay ? [{ ...pays[0], amount: String(bill.total) }, ...pays.slice(1)] : pays;
  const paid = round2(payments.reduce((a, p) => a + (Number(p.amount) || 0), 0));
  const due = round2(bill.total - paid);
  const itemCount = lines.reduce((a, l) => a + l.qty, 0);

  const catalog: CatalogItem[] = tab === 'service' ? services : products;
  const categories = useMemo(() => ['All', ...[...new Set(catalog.map((x) => x.category))].sort()], [catalog]);
  const shown = catalog.filter((x) => (cat === 'All' || x.category === cat) && `${x.name} ${x.sku ?? ''}`.toLowerCase().includes(iq.toLowerCase()));
  const qtyOf = (kind: string, id: string) => lines.filter((l) => l.kind === kind && l.refId === id).reduce((a, l) => a + l.qty, 0);
  const stockOf = (id: string) => products.find((p) => p.id === id)?.stock ?? 0;

  const switchTab = (t: 'service' | 'product') => { setTab(t); setCat('All'); setIq(''); };
  const add = (x: CatalogItem) => {
    const existing = tab === 'product' && lines.find((l) => l.kind === 'product' && l.refId === x.id);
    if (existing) return setLines(lines.map((l) => (l === existing ? { ...l, qty: Math.min(l.qty + 1, stockOf(x.id)) } : l)));
    setLines([...lines, { key: `${Date.now()}${Math.random()}`, kind: tab, refId: x.id, name: x.name, qty: 1, unitPrice: x.price, staffId: null }]);
  };
  const update = (key: string, patch: Partial<PosLine>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const setPay = (i: number, patch: Partial<Pay>) => { setAutoPay(false); setPays(payments.map((x, j) => (j === i ? { ...x, ...patch } : x))); };

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
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        <Card title="Client & branch">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div>
              <span className="label">Client</span>
              {newClient ? (
                <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                  <div className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-violet-700"><UserPlus size={16} />New client · saved with the bill</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Full name" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} aria-label="New client name" autoFocus />
                    <Input {...phoneProps} placeholder="Mobile number" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} aria-label="New client mobile" />
                    <Select value={newClient.gender} onChange={(e) => setNewClient({ ...newClient, gender: e.target.value })} aria-label="New client gender"><option value="" disabled>Gender</option><option>Female</option><option>Male</option><option>Other</option></Select>
                  </div>
                  <button type="button" onClick={() => setNewClient(null)} className="mt-3 text-[13px] font-medium text-violet-700 hover:underline">Choose an existing client instead</button>
                </div>
              ) : (
                <ClientCombobox id="bill-client" clients={customers} value={customerId} onChange={setCustomerId} disabled={!!initial.appointmentId}
                  onNew={initial.appointmentId ? undefined : (text) => { const d = /\d{4,}/.test(text); setNewClient({ name: d ? '' : text, phone: d ? text : '', gender: '' }); }} />
              )}
            </div>
            {branches.length > 0 && (
              <Field label="Branch"><Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            )}
          </div>
        </Card>

        <Card title="Bill items" pad={false}
          actions={lines.length > 0 && <span className="rounded-full bg-violet-50 px-3 py-1 text-[13px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">{itemCount} {itemCount === 1 ? 'item' : 'items'} · {money(bill.subtotal)}</span>}>
          {lines.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-ink-mute"><ShoppingBag size={22} /></span>
              <p className="mt-3 font-semibold">No items yet</p>
              <p className="text-[13.5px] text-ink-mute">Pick services or products from the catalogue below.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l, i) => {
                const max = l.kind === 'product' ? stockOf(l.refId) : 99;
                return (
                  <li key={l.key} className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1', l.kind === 'service' ? 'bg-violet-50 text-violet-600 ring-violet-100' : 'bg-teal-50 text-teal-600 ring-teal-100')}>
                        {l.kind === 'service' ? <Scissors size={18} /> : <Package size={18} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold leading-snug">{l.name}</div>
                        <div className="text-[12.5px] text-ink-mute">{l.kind === 'service' ? 'Service' : `Product · ${max} in stock`}</div>
                      </div>
                      <div className="tabular text-right text-[15px] font-bold">{money(bill.lines[i]?.total ?? 0)}</div>
                      <button type="button" aria-label={`Remove ${l.name}`} onClick={() => setLines(lines.filter((x) => x.key !== l.key))}
                        className="rounded-lg p-2 text-ink-mute hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 sm:pl-14">
                      {l.kind === 'service' && (
                        <Select value={l.staffId ?? ''} onChange={(e) => update(l.key, { staffId: e.target.value || null })} aria-label="Done by" className="min-w-[180px] flex-1 sm:max-w-[240px]">
                          <option value="">Done by…</option>
                          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                      )}
                      <div className="inline-flex items-center rounded-lg border border-stone-300 bg-white">
                        <button type="button" aria-label="Decrease quantity" disabled={l.qty <= 1} onClick={() => update(l.key, { qty: l.qty - 1 })} className="p-2.5 text-ink-soft hover:text-ink disabled:opacity-30"><Minus size={15} /></button>
                        <span className="tabular w-8 text-center font-semibold" aria-label="Quantity">{l.qty}</span>
                        <button type="button" aria-label="Increase quantity" disabled={l.qty >= max} onClick={() => update(l.key, { qty: l.qty + 1 })} className="p-2.5 text-ink-soft hover:text-ink disabled:opacity-30"><Plus size={15} /></button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] text-ink-mute">Price</span>
                        <div className="relative w-[120px]">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute">₹</span>
                          <Input type="number" min={0} step="1" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} className="pl-7" aria-label="Unit price" />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Add services & products" pad={false}
          actions={
            <div className="flex rounded-xl bg-stone-100 p-1">
              {(['service', 'product'] as const).map((t) => (
                <button key={t} type="button" onClick={() => switchTab(t)} aria-pressed={tab === t}
                  className={cx('rounded-lg px-3.5 py-1.5 text-[13.5px] font-semibold', tab === t ? 'bg-white text-violet-700 shadow-sm' : 'text-ink-soft hover:text-ink')}>
                  {t === 'service' ? `Services (${services.length})` : `Products (${products.length})`}
                </button>
              ))}
            </div>
          }>
          <div className="space-y-4 p-6">
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
              <Input value={iq} onChange={(e) => setIq(e.target.value)} placeholder={tab === 'service' ? 'Search services' : 'Search products or SKU'} className="pl-10" aria-label="Find item" />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
                  className={cx('rounded-full px-3 py-1 text-[13px] font-medium ring-1 ring-inset', cat === c ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-ink-soft ring-stone-300 hover:ring-violet-300')}>
                  {c}
                </button>
              ))}
            </div>
            {shown.length === 0 ? <p className="py-6 text-center text-ink-mute">No {tab === 'service' ? 'services' : 'products'} match.</p> : (
              <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((x) => {
                  const inBill = qtyOf(tab, x.id);
                  const out = tab === 'product' && (x.stock ?? 0) - inBill <= 0;
                  return (
                    <button key={x.id} type="button" onClick={() => add(x)} disabled={out}
                      aria-label={`${x.name} ${money(x.price)}${tab === 'product' ? ` ${x.stock} in stock` : ''}`}
                      className={cx('group flex flex-col rounded-xl border p-4 text-left transition',
                        inBill ? 'border-violet-300 bg-violet-50/60' : 'border-line bg-white hover:border-violet-300 hover:shadow-sm',
                        out && 'cursor-not-allowed opacity-50 hover:border-line hover:shadow-none')}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[14.5px] font-semibold leading-snug">{x.name}</span>
                        {inBill > 0 && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[11.5px] font-semibold text-white"><Check size={12} />{inBill}</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-mute">
                        {tab === 'service' ? <><Clock size={13} />{fmtDuration(x.duration ?? 0)} · {x.category}</> : <><Package size={13} />{x.stock} in stock · {x.category}</>}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="tabular text-[15px] font-bold">{money(x.price)}</span>
                        <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg', out ? 'bg-stone-100 text-ink-mute' : 'bg-violet-600 text-white group-hover:bg-violet-700')}><Plus size={17} /></span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-5 lg:sticky lg:top-24">
        <Card title="Summary">
          <div className="space-y-3 text-[14px]">
            <Row label="Subtotal" value={money(bill.subtotal)} />
            <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-2">
              <Select value={discType ?? ''} onChange={(e) => setDiscType((e.target.value || null) as typeof discType)} aria-label="Discount type">
                <option value="">No discount</option><option value="percent">Discount %</option><option value="amount">Discount ₹</option>
              </Select>
              {discType && <Input type="number" min={0} value={discValue} onChange={(e) => setDiscValue(e.target.value)} aria-label="Discount value" placeholder={discType === 'percent' ? '10' : '500'} />}
            </div>
            {bill.discount > 0 && <Row label="Discount" value={`− ${money(bill.discount)}`} />}
            <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-line pt-3">
              <span className="flex items-center gap-2">
                <input id="with-gst" type="checkbox" checked={withGst} onChange={(e) => setWithGst(e.target.checked)} className="h-4 w-4 accent-violet-600" />
                <span className="text-ink-soft">Charge GST ({gstRate}%)</span>
              </span>
              <span className="tabular">{withGst ? money(bill.tax) : 'No GST'}</span>
            </label>
            <div className="flex justify-between border-t border-line pt-3 text-[19px] font-bold"><span>Total</span><span className="tabular">{money(bill.total)}</span></div>
          </div>
        </Card>
        <Card title="Payment">
          <div className="space-y-3">
            {payments.map((p, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_110px_auto] gap-2">
                <Input type="number" min={0} step="0.01" value={p.amount} aria-label="Amount" onChange={(e) => setPay(i, { amount: e.target.value })} />
                <Select value={p.method} aria-label="Method" onChange={(e) => setPay(i, { method: e.target.value as Pay['method'] })}>
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </Select>
                <button type="button" aria-label="Remove payment" disabled={payments.length === 1}
                  onClick={() => { setAutoPay(false); setPays(payments.filter((_, j) => j !== i)); }} className="rounded-lg p-2 text-ink-mute hover:bg-rose-50 hover:text-rose-600 disabled:invisible"><Trash2 size={16} /></button>
                <Input value={p.reference} placeholder="Reference (optional)" aria-label="Reference" className="col-span-2 text-[13px]" onChange={(e) => setPay(i, { reference: e.target.value })} />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setAutoPay(false); setPays([...payments, { amount: String(Math.max(0, due)), method: 'Cash', reference: '' }]); }}>Split payment</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAutoPay(false); setPays([{ amount: '0', method: 'Cash', reference: '' }]); }}>Nothing paid now</Button>
            </div>
            <div className={cx('flex justify-between rounded-xl px-4 py-2.5 text-[14px] font-semibold', due > 0.005 ? 'bg-amber-50 text-amber-800' : due < -0.005 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800')}>
              <span>{due > 0.005 ? 'Balance due' : due < -0.005 ? 'Paid more than total' : 'Fully paid'}</span><span className="tabular">{money(Math.abs(due))}</span>
            </div>
          </div>
        </Card>
        <Field label="Notes on the bill"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Button className="w-full py-3 text-[15px]" disabled={pending || (!customerId && !newClient) || !lines.length || due < -0.005} onClick={save}>
          <Receipt size={18} />{pending ? 'Saving…' : `Save bill · ${money(bill.total)}`}
        </Button>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between"><span className="text-ink-soft">{label}</span><span className="tabular font-medium">{value}</span></div>
);
