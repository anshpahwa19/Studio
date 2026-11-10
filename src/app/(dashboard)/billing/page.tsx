'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Receipt,
  Plus,
  Search,
  X,
  Printer,
  Download,
  IndianRupee,
  Scissors,
  Package,
  Trash2,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

export default function BillingPage() {
  const searchParams = useSearchParams();

  // State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Branch state
  const [branches, setBranches] = useState<any[]>([]);
  const [posBranchId, setPosBranchId] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');

  // Load branches alongside other master data
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch('/api/branches');
        const json = await res.json();
        if (json.success) {
          setBranches(json.data);
          if (json.data.length > 0) {
            setPosBranchId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error('Branch load error:', err);
      }
    }
    loadBranches();
  }, []);

  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);

  // POS Modal State
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Invoice Details Modal & Payment Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payReference, setPayReference] = useState('');

  // POS Form State
  const [posCustomer, setPosCustomer] = useState('');
  const [posAppointmentId, setPosAppointmentId] = useState<string | null>(null);
  const [posItems, setPosItems] = useState<any[]>([]);
  const [posDiscountType, setPosDiscountType] = useState<'percentage' | 'fixed' | 'none'>('none');
  const [posDiscountVal, setPosDiscountVal] = useState<number>(0);
  const [posPayments, setPosPayments] = useState<{ amount: number; method: string; reference?: string }[]>([
    { amount: 0, method: 'UPI', reference: '' },
  ]);
  const [posNotes, setPosNotes] = useState('');
  const [posServiceSearch, setPosServiceSearch] = useState('');
  const [posProductSearch, setPosProductSearch] = useState('');

  // Memoized Searchable Options
  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: c.phone,
      badge: `Spent: ${formatCurrency(c.totalSpent)}`,
    }));
  }, [customers]);

  const filteredServices = useMemo(() => {
    if (!posServiceSearch.trim()) return services;
    const q = posServiceSearch.toLowerCase().trim();
    return services.filter(
      (svc) =>
        svc.name.toLowerCase().includes(q) ||
        (svc.category && svc.category.name && svc.category.name.toLowerCase().includes(q))
    );
  }, [services, posServiceSearch]);

  const filteredProducts = useMemo(() => {
    if (!posProductSearch.trim()) return products;
    const q = posProductSearch.toLowerCase().trim();
    return products.filter(
      (prod) =>
        prod.name.toLowerCase().includes(q) ||
        (prod.sku && prod.sku.toLowerCase().includes(q)) ||
        (prod.category && prod.category.name && prod.category.name.toLowerCase().includes(q))
    );
  }, [products, posProductSearch]);

  // Check URL params for action=new or linked customer/appointment
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setPosModalOpen(true);
      const custId = searchParams.get('customerId');
      const apptId = searchParams.get('appointmentId');
      if (custId) setPosCustomer(custId);
      if (apptId) setPosAppointmentId(apptId);
    }
  }, [searchParams]);

  // Load master data
  useEffect(() => {
    async function loadData() {
      try {
        const [custRes, svcRes, prodRes, taxRes] = await Promise.all([
          fetch('/api/customers?limit=100').then((r) => r.json()),
          fetch('/api/services').then((r) => r.json()),
          fetch('/api/inventory?limit=100').then((r) => r.json()),
          fetch('/api/settings/tax').then((r) => r.json()),
        ]);

        if (custRes.success) setCustomers(custRes.data);
        if (svcRes.success) setServices(svcRes.data);
        if (prodRes.success) setProducts(prodRes.data);
        if (taxRes.success) setTaxes(taxRes.data);
      } catch (err) {
        console.error('Master data load error:', err);
      }
    }
    loadData();
  }, []);

  // Fetch Invoices
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = `/api/billing?status=${statusFilter}`;
      if (branchFilter !== 'all') {
        url += `&branchId=${branchFilter}`;
      }
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data);
      }
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, searchQuery, branchFilter]);

  // POS Item Management
  const addServiceItem = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;

    // Default tax: GST 18% if tax setting exists
    const defaultTaxRate = svc.taxSetting?.rate ?? 18;

    setPosItems([
      ...posItems,
      {
        id: `svc-${Date.now()}`,
        type: 'service',
        serviceId: svc.id,
        name: svc.name,
        unitPrice: svc.price,
        quantity: 1,
        taxRate: defaultTaxRate,
      },
    ]);
  };

  const addProductItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setPosItems([
      ...posItems,
      {
        id: `prod-${Date.now()}`,
        type: 'product',
        productId: prod.id,
        name: prod.name,
        unitPrice: prod.sellingPrice,
        quantity: 1,
        taxRate: 18,
      },
    ]);
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...posItems];
    updated[index].quantity = newQty;
    setPosItems(updated);
  };

  const removeItem = (index: number) => {
    setPosItems(posItems.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = posItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  let discountAmount = 0;
  if (posDiscountType === 'percentage' && posDiscountVal > 0) {
    discountAmount = (subtotal * posDiscountVal) / 100;
  } else if (posDiscountType === 'fixed' && posDiscountVal > 0) {
    discountAmount = Math.min(posDiscountVal, subtotal);
  }

  const taxAmount = posItems.reduce((sum, item) => {
    const lineTotal = item.unitPrice * item.quantity;
    return sum + (lineTotal * (item.taxRate || 0)) / 100;
  }, 0);

  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  // Split payment handler
  const addPaymentSplit = () => {
    const currentPaid = posPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const remaining = Math.max(0, grandTotal - currentPaid);
    setPosPayments([...posPayments, { amount: remaining, method: 'Cash', reference: '' }]);
  };

  const updatePayment = (index: number, field: string, val: any) => {
    const updated = [...posPayments];
    updated[index] = { ...updated[index], [field]: val };
    setPosPayments(updated);
  };

  const removePaymentSplit = (index: number) => {
    setPosPayments(posPayments.filter((_, i) => i !== index));
  };

  // Auto-fill full payment when grand total changes and there's 1 payment entry
  useEffect(() => {
    if (posPayments.length === 1 && posPayments[0].amount === 0 && grandTotal > 0) {
      setPosPayments([{ ...posPayments[0], amount: grandTotal }]);
    }
  }, [grandTotal]);

  // Submit Invoice Creation
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posCustomer) {
      toast.error('Please select a customer');
      return;
    }
    if (!posItems.length) {
      toast.error('Please add at least one service or product item');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: posCustomer,
          appointmentId: posAppointmentId,
          items: posItems,
          discountType: posDiscountType === 'none' ? null : posDiscountType,
          discountValue: posDiscountVal,
          payments: posPayments.filter((p) => p.amount > 0),
          notes: posNotes,
          branchId: posBranchId || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Invoice ${json.data.invoiceNumber} generated!`);
        setPosModalOpen(false);
        // Reset POS Form
        setPosItems([]);
        setPosDiscountType('none');
        setPosDiscountVal(0);
        setPosPayments([{ amount: 0, method: 'UPI', reference: '' }]);
        setPosNotes('');
        setPosAppointmentId(null);
        fetchInvoices();
      } else {
        toast.error(json.error || 'Failed to create invoice');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // Record additional payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      const res = await fetch(`/api/billing/${selectedInvoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payAmount,
          method: payMethod,
          reference: payReference,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Payment recorded successfully');
        setPaymentModalOpen(false);
        setPayAmount('');
        setPayReference('');
        fetchInvoices();
        if (selectedInvoice) {
          setSelectedInvoice(json.data.invoice);
        }
      } else {
        toast.error(json.error || 'Failed to record payment');
      }
    } catch (err) {
      toast.error('Error recording payment');
    }
  };

  // Generate Downloadable PDF
  const handleDownloadPDF = (inv: any) => {
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica');

      // Header
      doc.setFontSize(16);
      doc.setTextColor(124, 58, 237); // Primary purple
      doc.text('SHRUTI PAHWA LUXURY SALON AND ACADEMY', 20, 25);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Premium Luxury Salon & Professional Beauty Academy', 20, 31);
      doc.text('123 MG Road, Indiranagar, Bengaluru - 560038', 20, 36);
      doc.text('GSTIN: 29ABCDE1234F1Z5 | Phone: +91 80 4567 8901', 20, 41);

      // Line
      doc.setDrawColor(220, 220, 220);
      doc.line(20, 46, 190, 46);

      // Invoice Info
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(`TAX INVOICE: ${inv.invoiceNumber}`, 20, 55);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${formatDate(inv.createdAt)}`, 20, 61);
      doc.text(`Status: ${inv.status.toUpperCase()}`, 20, 66);

      // Billed To
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text('BILLED TO:', 120, 55);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${inv.customer?.name || 'Walk-in Guest'}`, 120, 61);
      doc.text(`Phone: ${inv.customer?.phone || '-'}`, 120, 66);

      // Table Header
      let y = 80;
      doc.setFillColor(245, 245, 244);
      doc.rect(20, y, 170, 8, 'F');
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.text('Item Description', 24, y + 5.5);
      doc.text('Qty', 110, y + 5.5);
      doc.text('Unit Price', 130, y + 5.5);
      doc.text('Total (INR)', 165, y + 5.5);

      // Items
      y += 12;
      inv.items?.forEach((item: any) => {
        doc.setTextColor(40, 40, 40);
        doc.text(item.name, 24, y);
        doc.text(`${item.quantity}`, 112, y);
        doc.text(`Rs. ${item.unitPrice}`, 130, y);
        doc.text(`Rs. ${item.totalPrice}`, 165, y);
        y += 7;
      });

      // Totals
      y += 5;
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFontSize(9);
      doc.text(`Subtotal: Rs. ${inv.subtotal}`, 130, y);
      y += 6;
      if (inv.discountAmount > 0) {
        doc.text(`Discount: -Rs. ${inv.discountAmount}`, 130, y);
        y += 6;
      }
      doc.text(`GST / Taxes: Rs. ${inv.taxAmount}`, 130, y);
      y += 7;

      doc.setFontSize(11);
      doc.setTextColor(124, 58, 237);
      doc.text(`Grand Total: Rs. ${inv.totalAmount}`, 130, y);
      y += 6;

      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129);
      doc.text(`Amount Paid: Rs. ${inv.paidAmount}`, 130, y);
      y += 5;

      if (inv.balanceAmount > 0) {
        doc.setTextColor(244, 63, 94);
        doc.text(`Balance Due: Rs. ${inv.balanceAmount}`, 130, y);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Thank you for choosing Shruti Pahwa Luxury Salon and Academy! For feedback: info@shrutipahwa.com', 20, 275);

      doc.save(`Invoice_${inv.invoiceNumber}.pdf`);
      toast.success('Invoice PDF downloaded');
    } catch (e) {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Billing & Point of Sale (POS)
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Fast billing counter, GST compliance, split payment support & receipt generation
          </p>
        </div>

        <Button
          onClick={() => setPosModalOpen(true)}
          leftIcon={<Receipt className="w-4 h-4" />}
          className="shadow-sm font-semibold"
        >
          Create New Bill (POS)
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by invoice # or customer phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl p-1 border border-stone-200/60 text-xs w-full sm:w-auto overflow-x-auto">
          {['all', 'Paid', 'PartiallyPaid', 'Unpaid'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {st === 'all'
                ? 'All Bills'
                : st === 'PartiallyPaid'
                ? 'Partially Paid'
                : st}
            </button>
          ))}
        </div>
      </div>

      {/* Branch Toggle */}
      <div className="bg-white rounded-2xl px-4 py-3 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide shrink-0">Branch</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[{ id: 'all', name: 'All Branches' }, ...branches].map((b) => (
            <button
              key={b.id}
              onClick={() => setBranchFilter(b.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                branchFilter === b.id
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-[#7C3AED] hover:text-[#7C3AED]'
              }`}
            >
              {b.name}
            </button>
          ))}
          {branches.length === 0 && (
            <span className="text-xs text-stone-400 italic">Loading branches...</span>
          )}
        </div>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="h-96 bg-white rounded-2xl border border-stone-200/80 flex flex-col items-center justify-center gap-2">
          <Spinner size="md" />
          <p className="text-xs text-stone-400">Loading bills and transactions...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center">
          <Receipt className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-stone-800">No Invoices Found</h3>
          <p className="text-xs text-stone-400 mt-1 mb-4">
            Create a new invoice or adjust your search filter
          </p>
          <Button size="sm" onClick={() => setPosModalOpen(true)}>
            Open POS Register
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-600 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Total Amount</th>
                  <th className="px-5 py-3">Paid / Balance</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-stone-900">
                        {inv.customer?.name}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {inv.customer?.phone}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-500">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      {inv.items?.length || 0} items
                    </td>
                    <td className="px-5 py-3.5 font-bold text-stone-900">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-emerald-700 font-semibold">
                        {formatCurrency(inv.paidAmount)}
                      </span>
                      {inv.balanceAmount > 0 && (
                        <span className="text-rose-600 block text-[11px]">
                          Due: {formatCurrency(inv.balanceAmount)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          inv.status === 'Paid'
                            ? 'success'
                            : inv.status === 'PartiallyPaid'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {inv.branch ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          {inv.branch.name}
                        </span>
                      ) : (
                        <span className="text-stone-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.balanceAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPayAmount(inv.balanceAmount.toString());
                              setPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            Collect
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setDetailsModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── FULL POS MODAL ────────────────────────────────────────── */}
      <Modal
        isOpen={posModalOpen}
        onClose={() => setPosModalOpen(false)}
        title="Point of Sale (POS) Counter"
        description="Fast billing for salon services and retail cosmetics"
        size="2xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-5">
          {/* Top Row: Customer Selection */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80">
            <SearchableSelect
              label="Select Billed Customer *"
              placeholder="-- Search & Choose Client --"
              searchPlaceholder="Search client by name or phone (e.g. Meera, 99001)..."
              value={posCustomer}
              onChange={(val) => setPosCustomer(val)}
              options={customerOptions}
              emptyMessage="No clients found matching your search"
              required
            />
          </div>

          {/* Branch Selector */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80">
            <p className="text-xs font-semibold text-stone-600 mb-2">Select Branch *</p>
            <div className="flex items-center gap-2 flex-wrap">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setPosBranchId(b.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    posBranchId === b.id
                      ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-[#7C3AED] hover:text-[#7C3AED]'
                  }`}
                >
                  {b.name}
                  <span className="block text-[10px] font-normal opacity-70">{b.address}</span>
                </button>
              ))}
              {branches.length === 0 && (
                <span className="text-xs text-stone-400 italic">No branches found. Please run the seed.</span>
              )}
            </div>
          </div>

          {/* Catalog Pickers: Services & Products */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Add Salon Services */}
            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Add Salon Services</span>
                </h4>
                <span className="text-[11px] text-stone-400 font-medium">
                  {filteredServices.length} found
                </span>
              </div>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={posServiceSearch}
                  onChange={(e) => setPosServiceSearch(e.target.value)}
                  placeholder="Search service by name (e.g. Haircut, Gel, Spa)..."
                  className="w-full pl-8 pr-7 py-1 text-xs text-stone-900 bg-stone-50/70 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:bg-white transition-all"
                />
                {posServiceSearch && (
                  <button
                    type="button"
                    onClick={() => setPosServiceSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                {filteredServices.length === 0 ? (
                  <p className="text-center py-6 text-xs text-stone-400">
                    No services match &ldquo;{posServiceSearch}&rdquo;
                  </p>
                ) : (
                  filteredServices.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => addServiceItem(svc.id)}
                      className="w-full text-left p-2 rounded-lg bg-stone-50 hover:bg-purple-50 border border-stone-100 hover:border-purple-200 text-xs flex items-center justify-between transition-colors group"
                    >
                      <div className="flex flex-col truncate flex-1 pr-2">
                        <span className="font-medium text-stone-800 group-hover:text-[#7C3AED] truncate">
                          {svc.name}
                        </span>
                        {svc.category?.name && (
                          <span className="text-[10px] text-stone-400 truncate">
                            {svc.category.name}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-stone-900 shrink-0">
                        {formatCurrency(svc.price)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Quick Add Retail Products */}
            <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>Add Retail Products</span>
                </h4>
                <span className="text-[11px] text-stone-400 font-medium">
                  {filteredProducts.length} found
                </span>
              </div>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={posProductSearch}
                  onChange={(e) => setPosProductSearch(e.target.value)}
                  placeholder="Search products (e.g. Shampoo, Serum, SKU)..."
                  className="w-full pl-8 pr-7 py-1 text-xs text-stone-900 bg-stone-50/70 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                {posProductSearch && (
                  <button
                    type="button"
                    onClick={() => setPosProductSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                {filteredProducts.length === 0 ? (
                  <p className="text-center py-6 text-xs text-stone-400">
                    No products match &ldquo;{posProductSearch}&rdquo;
                  </p>
                ) : (
                  filteredProducts.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => addProductItem(prod.id)}
                      className="w-full text-left p-2 rounded-lg bg-stone-50 hover:bg-emerald-50 border border-stone-100 hover:border-emerald-200 text-xs flex items-center justify-between transition-colors group"
                    >
                      <div className="flex flex-col truncate flex-1 pr-2">
                        <span className="font-medium text-stone-800 group-hover:text-emerald-700 truncate">
                          {prod.name}
                        </span>
                        <span className="text-[10px] text-stone-400 block truncate">
                          Stock: {prod.stock} {prod.unit} {prod.sku ? `• ${prod.sku}` : ''}
                        </span>
                      </div>
                      <span className="font-bold text-stone-900 shrink-0">
                        {formatCurrency(prod.sellingPrice)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
              Invoice Line Items ({posItems.length})
            </h4>

            {posItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                Click on any service or product above to add to the invoice
              </div>
            ) : (
              <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-600">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Tax (GST)</th>
                      <th className="p-2.5">Total</th>
                      <th className="p-2.5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {posItems.map((item, idx) => (
                      <tr key={item.id} className="bg-white">
                        <td className="p-2.5 font-semibold text-stone-900">
                          {item.name}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              item.type === 'service'
                                ? 'bg-purple-50 text-[#7C3AED]'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQty(idx, parseInt(e.target.value, 10))
                            }
                            className="w-12 px-1.5 py-0.5 border border-stone-200 rounded text-center"
                          />
                        </td>
                        <td className="p-2.5 font-mono">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="p-2.5 text-stone-500">
                          {item.taxRate}%
                        </td>
                        <td className="p-2.5 font-bold font-mono text-stone-900">
                          {formatCurrency(
                            item.unitPrice * item.quantity * (1 + item.taxRate / 100)
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-stone-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Discount & Totals Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Apply Special Discount
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={posDiscountType}
                  onChange={(e: any) => setPosDiscountType(e.target.value)}
                  className="text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-2 font-medium"
                >
                  <option value="none">No Discount</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Flat (₹)</option>
                </select>
                {posDiscountType !== 'none' && (
                  <input
                    type="number"
                    min="0"
                    placeholder="Discount Value"
                    value={posDiscountVal}
                    onChange={(e) => setPosDiscountVal(Number(e.target.value))}
                    className="w-28 text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-2 font-medium"
                  />
                )}
              </div>
            </div>

            {/* Calculations Box */}
            <div className="space-y-1.5 text-xs text-stone-600 text-right">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-stone-800">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-500">
                <span>Calculated GST:</span>
                <span>+{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                <span>Final Payable:</span>
                <span className="text-[#7C3AED] font-mono">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Split Counter */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-900">
                Settlement & Payment Method(s)
              </label>
              <button
                type="button"
                onClick={addPaymentSplit}
                className="text-xs font-semibold text-[#7C3AED] hover:underline"
              >
                + Split Payment
              </button>
            </div>

            <div className="space-y-2">
              {posPayments.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={p.method}
                    onChange={(e) => updatePayment(idx, 'method', e.target.value)}
                    className="text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-2 font-medium"
                  >
                    <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash Currency</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Other">Bank Transfer / NetBanking</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={p.amount}
                    onChange={(e) =>
                      updatePayment(idx, 'amount', Number(e.target.value))
                    }
                    className="w-32 text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-2 font-bold font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Ref / Transaction ID (Optional)"
                    value={p.reference}
                    onChange={(e) => updatePayment(idx, 'reference', e.target.value)}
                    className="flex-1 text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-2"
                  />
                  {posPayments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentSplit(idx)}
                      className="text-stone-400 hover:text-rose-600 p-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <Button
              variant="outline"
              onClick={() => setPosModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Generate Bill & Print Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── INVOICE DETAILS MODAL ────────────────────────────────────── */}
      {selectedInvoice && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title={`Invoice ${selectedInvoice.invoiceNumber}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Invoice Top Details */}
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <div>
                <span className="text-stone-400 font-semibold uppercase">Client</span>
                <p className="font-bold text-stone-900 mt-0.5">
                  {selectedInvoice.customer?.name}
                </p>
                <p className="text-stone-500">{selectedInvoice.customer?.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-stone-400 font-semibold uppercase">Date</span>
                <p className="font-semibold text-stone-900 mt-0.5">
                  {formatDate(selectedInvoice.createdAt)}
                </p>
                <Badge
                  variant={
                    selectedInvoice.status === 'Paid'
                      ? 'success'
                      : selectedInvoice.status === 'PartiallyPaid'
                      ? 'warning'
                      : 'danger'
                  }
                  size="sm"
                  className="mt-1"
                >
                  {selectedInvoice.status}
                </Badge>
              </div>
            </div>

            {/* Items */}
            <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-600">
                  <tr>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Tax</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {selectedInvoice.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="p-3 font-semibold text-stone-900">{it.name}</td>
                      <td className="p-3">{it.quantity}</td>
                      <td className="p-3">{formatCurrency(it.unitPrice)}</td>
                      <td className="p-3 text-stone-500">{it.taxRate}%</td>
                      <td className="p-3 text-right font-bold text-stone-900">
                        {formatCurrency(it.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payment Summary */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              {selectedInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(selectedInvoice.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-500">
                <span>Tax (GST):</span>
                <span>+{formatCurrency(selectedInvoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-stone-900 pt-1 border-t border-stone-200">
                <span>Total Amount:</span>
                <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Paid Amount:</span>
                <span>{formatCurrency(selectedInvoice.paidAmount)}</span>
              </div>
              {selectedInvoice.balanceAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(selectedInvoice.balanceAmount)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPDF(selectedInvoice)}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download PDF
              </Button>

              {selectedInvoice.balanceAmount > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailsModalOpen(false);
                    setPayAmount(selectedInvoice.balanceAmount.toString());
                    setPaymentModalOpen(true);
                  }}
                  leftIcon={<IndianRupee className="w-3.5 h-3.5" />}
                >
                  Collect Balance ({formatCurrency(selectedInvoice.balanceAmount)})
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ─── RECORD PAYMENT MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Payment Collection"
        size="sm"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            type="number"
            label="Payment Amount (₹)"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
          />

          <Select
            label="Payment Method"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            options={[
              { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
              { value: 'Cash', label: 'Cash' },
              { value: 'Card', label: 'Debit / Credit Card' },
              { value: 'Other', label: 'Other / Bank Transfer' },
            ]}
          />

          <Input
            label="Transaction Reference / Note (Optional)"
            placeholder="e.g. UPI Ref #123456"
            value={payReference}
            onChange={(e) => setPayReference(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
