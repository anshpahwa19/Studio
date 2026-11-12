'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Input, Select } from '@/components/ui';
import { Modal } from '@/components/modal';
import { useAction } from '@/components/use-action';
import { fmtDateTime, isoDate, money } from '@/lib/format';
import { archiveProduct, moveStock, saveProduct, stockHistory, transferStock, type ProductInput } from './actions';

type Product = { id: string; name: string; sku: string | null; category: string; supplierId: string | null; supplierName: string | null; costPrice: number; price: number; stock: number; byBranch: Record<string, number>; reorderLevel: number; unit: string };
type Branch = { id: string; name: string };
type Move = Awaited<ReturnType<typeof stockHistory>>[number];

const MOVE_LABEL: Record<string, string> = { IN: 'Received', OUT: 'Used / removed', ADJUST: 'Count correction', SALE: 'Sold', RETURN: 'Returned', TRANSFER: 'Transfer' };

export function InventoryTable({ products, suppliers, branches, branch, autoStock = false }: { products: Product[]; suppliers: { id: string; name: string }[]; branches: Branch[]; branch: string; autoStock?: boolean }) {
  const startBranch = branch || branches[0]?.id || '';
  const otherBranch = (from: string) => branches.find((b) => b.id !== from)?.id ?? '';
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [edit, setEdit] = useState<ProductInput | null>(null);
  const [move, setMove] = useState<{ p: Product; type: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER'; qty: string; note: string; date: string; supplierId: string; branchId: string; toBranchId: string; pick?: boolean } | null>(
    autoStock && products.length ? { p: products[0], type: 'IN', qty: '', note: '', date: isoDate(), supplierId: products[0].supplierId ?? '', branchId: startBranch, toBranchId: otherBranch(startBranch), pick: true } : null,
  );
  const [history, setHistory] = useState<{ p: Product; rows: Move[] | null } | null>(null);
  const { run, pending } = useAction();

  const categories = [...new Set(products.map((p) => p.category))].sort();
  const shown = products.filter((p) => (!lowOnly || p.stock <= p.reorderLevel) && `${p.name} ${p.sku ?? ''} ${p.category}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or category" className="max-w-xs" aria-label="Search products" />
        <label className="flex items-center gap-2 text-[13.5px]"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="h-4 w-4 accent-plum-600" />Only items to reorder</label>
        <Button className="ml-auto" onClick={() => setEdit({ name: '', category: categories[0] ?? 'General', costPrice: 0, price: '' as unknown as number, reorderLevel: 5, unit: 'pcs', openingStock: 0, openingBranchId: startBranch || null })}>
          <Plus size={16} />Add product
        </Button>
      </div>
      <Card pad={false}>
        {shown.length === 0 ? <Empty title={products.length ? 'No products match' : 'No products yet'} /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Product</th><th>Category</th><th className="text-right">Cost</th><th className="text-right">Price</th><th className="text-right">Margin</th><th className="text-right">In stock</th><th /></tr></thead>
              <tbody>
                {shown.map((p) => {
                  const low = p.stock <= p.reorderLevel;
                  return (
                    <tr key={p.id} className="hover:bg-canvas/60">
                      <td><div className="font-medium">{p.name}</div><div className="text-[12px] text-ink-mute">{[p.sku, p.supplierName].filter(Boolean).join(' · ') || '—'}</div></td>
                      <td className="text-ink-soft">{p.category}</td>
                      <td className="tabular text-right text-ink-soft">{money(p.costPrice)}</td>
                      <td className="tabular text-right">{money(p.price)}</td>
                      <td className="tabular text-right text-ink-soft">{p.price > 0 ? `${Math.round(((p.price - p.costPrice) / p.price) * 100)}%` : '—'}</td>
                      <td className="text-right">
                        <span className="tabular font-medium">{p.stock} {p.unit}</span>
                        {!branch && branches.length > 1 && <div className="text-[11.5px] text-ink-mute">{branches.map((b) => `${b.name.split(' ')[0]} ${p.byBranch[b.id] ?? 0}`).join(' · ')}</div>}
                        {low && <div><Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock === 0 ? 'Out of stock' : 'Reorder'}</Badge></div>}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="secondary" onClick={() => setMove({ p, type: 'IN', qty: '', note: '', date: isoDate(), supplierId: p.supplierId ?? '', branchId: startBranch, toBranchId: otherBranch(startBranch) })}>Stock</Button>
                          <Button size="sm" variant="ghost" onClick={async () => { setHistory({ p, rows: null }); setHistory({ p, rows: await stockHistory(p.id) }); }}>History</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEdit({ ...p })}>Edit</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit product' : 'Add product'}>
        {edit && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => { e.preventDefault(); if ((await run(() => saveProduct(edit), 'Product saved')) !== false) setEdit(null); }}>
            <Field label="Product name" className="col-span-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
            <Field label="Category">
              <Input list="product-categories" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} required />
              <datalist id="product-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="SKU"><Input value={edit.sku ?? ''} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /></Field>
            <Field label="Cost price (₹)"><Input type="number" min="0" step="0.01" value={edit.costPrice} onChange={(e) => setEdit({ ...edit, costPrice: e.target.value as unknown as number })} /></Field>
            <Field label="Selling price before GST (₹)"><Input type="number" min="0" step="0.01" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value as unknown as number })} required /></Field>
            <Field label="Unit"><Input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} required placeholder="pcs, ml, bottle" /></Field>
            <Field label="Reorder at"><Input type="number" min="0" value={edit.reorderLevel} onChange={(e) => setEdit({ ...edit, reorderLevel: e.target.value as unknown as number })} /></Field>
            {!edit.id && <Field label="Opening stock"><Input type="number" min="0" value={edit.openingStock ?? 0} onChange={(e) => setEdit({ ...edit, openingStock: e.target.value as unknown as number })} /></Field>}
            {!edit.id && branches.length > 0 && <Field label="Opening stock is at"><Select value={edit.openingBranchId ?? ''} onChange={(e) => setEdit({ ...edit, openingBranchId: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>}
            {edit.id && branches.length > 0 && (() => {
              const cur = products.find((x) => x.id === edit.id);
              return cur && (
                <div className="col-span-2 rounded-lg border border-line p-3">
                  <div className="text-[12.5px] font-medium text-ink-soft">Stock by branch</div>
                  <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">{branches.map((b) => <span key={b.id}>{b.name}: <b>{cur.byBranch[b.id] ?? 0} {cur.unit}</b></span>)}</div>
                  <p className="mt-1 text-[12px] text-ink-mute">To add, remove or move stock for a branch, use the Stock button on the product.</p>
                </div>
              );
            })()}
            <Field label="Supplier" className="col-span-2" hint={suppliers.length ? undefined : 'Add suppliers on the Suppliers page first'}>
              <Select value={edit.supplierId ?? ''} onChange={(e) => setEdit({ ...edit, supplierId: e.target.value || null })}>
                <option value="">No supplier</option>
                {suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>
            </Field>
            <div className="col-span-2 flex justify-between gap-2">
              {edit.id ? <Button variant="danger" onClick={async () => { if ((await run(() => archiveProduct(edit.id!), 'Product archived')) !== false) setEdit(null); }}>Archive</Button> : <span />}
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button type="submit" disabled={pending}>Save product</Button></div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!move} onClose={() => setMove(null)} title={move ? `Update stock · ${move.p.name}` : ''}>
        {move && (
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            const t = move.type;
            const job = t === 'TRANSFER'
              ? () => transferStock({ productId: move.p.id, fromBranchId: move.branchId, toBranchId: move.toBranchId, qty: Number(move.qty), note: move.note, date: move.date })
              : () => moveStock({ productId: move.p.id, branchId: move.branchId || null, type: t, qty: Number(move.qty), note: move.note, date: move.date, supplierId: move.supplierId || null });
            if ((await run(job, move.type === 'TRANSFER' ? 'Stock transferred' : 'Stock updated')) !== false) setMove(null);
          }}>
            {move.pick && (
              <Field label="Product">
                <Select value={move.p.id} onChange={(e) => { const p = products.find((x) => x.id === e.target.value) ?? move.p; setMove({ ...move, p, supplierId: p.supplierId ?? '' }); }}>
                  {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1 sm:grid-cols-4">
              {(branches.length > 1 ? (['IN', 'OUT', 'ADJUST', 'TRANSFER'] as const) : (['IN', 'OUT', 'ADJUST'] as const)).map((t) => (
                <button key={t} type="button" aria-pressed={move.type === t} onClick={() => setMove({ ...move, type: t })}
                  className={`rounded-md px-2 py-1.5 text-[13px] font-medium ${move.type === t ? 'bg-plum-600 text-white' : 'text-ink-soft hover:bg-canvas'}`}>
                  {t === 'IN' ? 'Received' : t === 'OUT' ? 'Used / removed' : t === 'ADJUST' ? 'Set count' : 'Transfer'}
                </button>
              ))}
            </div>
            {branches.length > 0 && (
              <div className={move.type === 'TRANSFER' ? 'grid grid-cols-2 gap-4' : ''}>
                <Field label={move.type === 'TRANSFER' ? 'From branch' : 'Branch'}>
                  <Select value={move.branchId} onChange={(e) => setMove({ ...move, branchId: e.target.value, toBranchId: move.toBranchId === e.target.value ? otherBranch(e.target.value) : move.toBranchId })}>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
                {move.type === 'TRANSFER' && (
                  <Field label="To branch">
                    <Select value={move.toBranchId} onChange={(e) => setMove({ ...move, toBranchId: e.target.value })}>
                      {branches.filter((b) => b.id !== move.branchId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </Field>
                )}
              </div>
            )}
            <p className="text-ink-soft">Currently {branches.length ? move.p.byBranch[move.branchId] ?? 0 : move.p.stock} {move.p.unit} in stock{branches.length ? ` at ${branches.find((b) => b.id === move.branchId)?.name}` : ''}.</p>
            <Field label={move.type === 'ADJUST' ? 'Actual count on the shelf' : move.type === 'TRANSFER' ? 'Quantity to move' : 'Quantity'}>
              <Input type="number" min="0" value={move.qty} onChange={(e) => setMove({ ...move, qty: e.target.value })} required autoFocus />
            </Field>
            {move.type === 'IN' && (
              <Field label="Received from">
                <Select value={move.supplierId} onChange={(e) => setMove({ ...move, supplierId: e.target.value })}>
                  <option value="">Not recorded</option>
                  {suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label={move.type === 'IN' ? 'Date received' : 'Date'}><Input type="date" max={isoDate()} value={move.date} onChange={(e) => setMove({ ...move, date: e.target.value })} required /></Field>
            <Field label="Note"><Input value={move.note} onChange={(e) => setMove({ ...move, note: e.target.value })} placeholder={move.type === 'IN' ? 'Supplier bill number' : 'Used in salon, damaged, expired'} /></Field>
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setMove(null)}>Cancel</Button><Button type="submit" disabled={pending}>{move.type === 'TRANSFER' ? 'Transfer stock' : 'Update stock'}</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!history} onClose={() => setHistory(null)} title={history ? `Stock history · ${history.p.name}` : ''}>
        {history && (history.rows === null ? <p className="text-ink-mute">Loading…</p> : history.rows.length === 0 ? <p className="text-ink-mute">No stock changes yet.</p> : (
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {history.rows.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <div className="min-w-0"><div className="font-medium">{MOVE_LABEL[m.type] ?? m.type}</div><div className="truncate text-[12px] text-ink-mute">{fmtDateTime(m.createdAt)}{m.branch && ` · ${m.branch.name}`}{m.supplier && ` · ${m.supplier.name}`}{m.note && ` · ${m.note}`}</div></div>
                <div className="tabular shrink-0 text-right"><span className={m.change > 0 ? 'text-emerald-700' : 'text-red-700'}>{m.change > 0 ? '+' : ''}{m.change}</span><div className="text-[12px] text-ink-mute">→ {m.balance}</div></div>
              </li>
            ))}
          </ul>
        ))}
      </Modal>
    </>
  );
}
