'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Wallet,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  Tag,
  Trash2,
  FolderPlus,
  Receipt,
  ArrowDownLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setExpenseModalOpen(true);
    }
  }, [searchParams]);

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');

  // Category Form
  const [catName, setCatName] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let url = `/api/expenses?categoryId=${selectedCategory}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data);
        if (json.categories) setCategories(json.categories);
        setTotalAmount(json.totalAmount || 0);
      }
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory, searchQuery]);

  const resetForm = () => {
    setCategoryId(categories[0]?.id || '');
    setAmount('');
    setDescription('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Cash');
    setVendor('');
    setNotes('');
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: Number(amount),
          description,
          expenseDate,
          paymentMethod,
          vendor,
          notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Expense recorded successfully');
        setExpenseModalOpen(false);
        resetForm();
        fetchExpenses();
      } else {
        toast.error(json.error || 'Failed to record expense');
      }
    } catch (err) {
      toast.error('Error saving expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Expense entry deleted');
        fetchExpenses();
      }
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    try {
      const res = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Category created');
        setCategoryModalOpen(false);
        setCatName('');
        fetchExpenses();
      }
    } catch (err) {
      toast.error('Failed to create category');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Business Expenses & Payouts
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track daily salon expenditures, rent, staff payouts, vendor deliveries and utility costs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCategoryModalOpen(true)}
            leftIcon={<FolderPlus className="w-4 h-4" />}
          >
            New Category
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setExpenseModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm font-semibold"
          >
            Record Expense
          </Button>
        </div>
      </div>

      {/* Ribbon: Search, Filter & Total Expense Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Expense Metric Card */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Total Recorded Expenses
            </span>
            <h3 className="text-2xl font-bold text-rose-600 font-mono mt-0.5">
              {formatCurrency(totalAmount)}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-sm flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search vendor or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-sm flex items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700 font-medium"
          >
            <option value="all">All Expense Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="h-96 bg-white rounded-2xl border border-stone-200/80 flex flex-col items-center justify-center gap-2">
          <Spinner size="md" />
          <p className="text-xs text-stone-400">Loading expense logs...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center">
          <Wallet className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-stone-800">No Expenses Recorded</h3>
          <p className="text-xs text-stone-400 mt-1 mb-4">
            Record salon expenses to accurately calculate your net business profit
          </p>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setExpenseModalOpen(true);
            }}
          >
            Record Expense
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-600 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3">Expense Date</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Vendor / Recipient</th>
                  <th className="px-5 py-3">Payment Method</th>
                  <th className="px-5 py-3">Amount (₹)</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-stone-700">
                      {formatDate(exp.expenseDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="purple" size="sm">
                        {exp.category?.name || 'General'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-stone-900">
                      {exp.description || 'Business Expense'}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      {exp.vendor || '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium text-[11px]">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-rose-600 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── RECORD EXPENSE MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Record Salon Expense"
        description="Log operational costs to ensure accurate net profit calculations"
        size="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Expense Category *"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
            <Input
              type="number"
              label="Amount (₹) *"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <Input
            label="Expense Description *"
            placeholder="e.g. Monthly salon electricity bill / Shampoo bulk restocking"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="date"
              label="Expense Date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
            <Select
              label="Paid Via"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'Cash', label: 'Cash Currency' },
                { value: 'UPI', label: 'UPI / Online Transfer' },
                { value: 'Card', label: 'Company Debit/Credit Card' },
                { value: 'NetBanking', label: 'Bank Cheque / NetBanking' },
              ]}
            />
            <Input
              label="Vendor / Payee"
              placeholder="e.g. Bescom / Wholesale India"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </div>

          <Input
            label="Notes / Receipt Number (Optional)"
            placeholder="e.g. Receipt #984392"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <Button
              variant="outline"
              onClick={() => setExpenseModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Record Expense Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── ADD EXPENSE CATEGORY MODAL ───────────────────────────────── */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Add Expense Category"
        size="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            label="Category Name *"
            placeholder="e.g. Salon Insurance"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Save Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
