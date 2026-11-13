'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button, Card, Empty, Field, Input, Select } from '@/components/ui';
import { Modal } from '@/components/modal';
import { SortTh, useSort } from '@/components/sort-button';
import { useAction } from '@/client/use-action';
import { fmtDate, isoDate, money } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/validate';
import { deleteExpense, saveExpense, type ExpenseInput } from './api';

type Expense = { id: string; date: string; category: string; description: string; amount: number; method: string; vendor: string | null; branchId: string | null; branch: { name: string } | null };

export function ExpenseList({ from, to, branch, allBranches, expenses, categories, branches, autoOpen = false }: { from: string; to: string; branch: string; allBranches: { id: string; name: string }[]; expenses: Expense[]; categories: string[]; branches: { id: string; name: string }[]; autoOpen?: boolean }) {
  const router = useRouter();
  const today = isoDate();
  const blank = (): ExpenseInput => ({ date: today >= from && today <= to ? today : to, category: 'General', description: '', amount: '' as unknown as number, method: 'UPI', vendor: '', branchId: branch || branches[0]?.id || null });
  const [f, setF] = useState<ExpenseInput | null>(autoOpen ? blank() : null);
  const { run, pending } = useAction();
  const { sort, dir, toggle, apply } = useSort<Expense>({
    date: (e) => e.date, description: (e) => e.description.toLowerCase(), method: (e) => e.method.toLowerCase(), amount: (e) => e.amount,
  }, 'date', 'desc');
  const go = (a: string, b: string, br: string) => router.push(`/expenses?from=${a}&to=${b}${br ? `&branch=${br}` : ''}`);

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input type="date" value={from} max={to} onChange={(e) => e.target.value && go(e.target.value, to, branch)} className="w-auto" aria-label="From date" />
        <span className="text-ink-mute">to</span>
        <Input type="date" value={to} min={from} onChange={(e) => e.target.value && go(from, e.target.value, branch)} className="w-auto" aria-label="To date" />
        {allBranches.length > 0 && (
          <Select value={branch} aria-label="Branch" className="w-[210px]" onChange={(e) => go(from, to, e.target.value)}>
            <option value="">All branches</option>
            {allBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
        <Button className="ml-auto" onClick={() => setF(blank())}>
          <Plus size={16} />Record expense
        </Button>
      </div>
      <Card pad={false}>
        {expenses.length === 0 ? <Empty title="No expenses in this period" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr>
                <SortTh label="Date" field="date" sort={sort} dir={dir} onSort={toggle} />
                <SortTh label="Expense" field="description" sort={sort} dir={dir} onSort={toggle} />
                <SortTh label="Paid via" field="method" sort={sort} dir={dir} onSort={toggle} />
                <SortTh label="Amount" field="amount" sort={sort} dir={dir} onSort={toggle} right />
                <th />
              </tr></thead>
              <tbody>
                {apply(expenses).map((e) => (
                  <tr key={e.id} className="hover:bg-canvas/60">
                    <td className="whitespace-nowrap text-ink-soft">{fmtDate(e.date, { day: 'numeric', month: 'short' })}</td>
                    <td><div className="font-medium">{e.description}</div><div className="text-[12px] text-ink-mute">{[e.category, e.vendor, e.branch?.name].filter(Boolean).join(' · ')}</div></td>
                    <td className="text-ink-soft">{e.method}</td>
                    <td className="tabular text-right font-medium">{money(e.amount)}</td>
                    <td className="text-right"><Button size="sm" variant="ghost" onClick={() => setF({ ...e, method: e.method as ExpenseInput['method'] })}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Edit expense' : 'Record expense'}>
        {f && (
          <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => { e.preventDefault(); if ((await run(() => saveExpense(f), 'Expense saved')) !== false) setF(null); }}>
            <Field label="What was it for" className="col-span-2"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} required placeholder="Electricity bill for October" autoFocus /></Field>
            <Field label="Amount (₹)"><Input type="number" min="1" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value as unknown as number })} required /></Field>
            <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></Field>
            <Field label="Paid via"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as ExpenseInput['method'] })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
            {branches.length > 0 && (
              <Field label="Branch"><Select value={f.branchId ?? ''} onChange={(e) => setF({ ...f, branchId: e.target.value || null })}><option value="">Whole business</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            )}
            <div className="col-span-2 flex justify-between gap-2">
              {f.id ? <Button variant="danger" onClick={async () => { if ((await run(() => deleteExpense(f.id!), 'Expense deleted')) !== false) setF(null); }}>Delete</Button> : <span />}
              <div className="flex gap-2"><Button variant="secondary" onClick={() => setF(null)}>Cancel</Button><Button type="submit" disabled={pending}>Save expense</Button></div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
