'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Edit2,
  Trash2,
  Boxes,
  Truck,
  IndianRupee,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [minStockLevel, setMinStockLevel] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [supplierId, setSupplierId] = useState('');

  // Stock Adjustment State
  const [stockAdjustmentType, setStockAdjustmentType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('New Purchase Stock Arrival');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let url = `/api/inventory?categoryId=${selectedCategory}&lowStock=${lowStockFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
        if (json.categories) setCategories(json.categories);
        if (json.suppliers) setSuppliers(json.suppliers);
      }
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedCategory, searchQuery, lowStockFilter]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setSku('');
    setBarcode('');
    setPurchasePrice('');
    setSellingPrice('');
    setStock('10');
    setMinStockLevel('5');
    setUnit('pcs');
    setSupplierId('');
  };

  const handleEdit = (prod: any) => {
    setEditingId(prod.id);
    setName(prod.name);
    setDescription(prod.description || '');
    setCategoryId(prod.categoryId);
    setSku(prod.sku || '');
    setBarcode(prod.barcode || '');
    setPurchasePrice(prod.purchasePrice?.toString() || '0');
    setSellingPrice(prod.sellingPrice?.toString() || '0');
    setStock(prod.stock?.toString() || '0');
    setMinStockLevel(prod.minStockLevel?.toString() || '5');
    setUnit(prod.unit || 'pcs');
    setSupplierId(prod.supplierId || '');
    setProductModalOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingId ? `/api/inventory/${editingId}` : '/api/inventory';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          categoryId,
          sku: sku || null,
          barcode: barcode || null,
          purchasePrice: Number(purchasePrice) || 0,
          sellingPrice: Number(sellingPrice),
          stock: Number(stock) || 0,
          minStockLevel: Number(minStockLevel) || 5,
          unit,
          supplierId: supplierId || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? 'Product updated' : 'Product added to inventory');
        setProductModalOpen(false);
        resetForm();
        fetchInventory();
      } else {
        toast.error(json.error || 'Failed to save product');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/inventory/${selectedProduct.id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: stockAdjustmentType,
          quantity: Number(adjustmentQty),
          reason: adjustmentReason,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Stock adjusted successfully');
        setStockModalOpen(false);
        setAdjustmentQty('');
        fetchInventory();
      } else {
        toast.error(json.error || 'Failed to adjust stock');
      }
    } catch (err) {
      toast.error('Error adjusting stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistory = async (prod: any) => {
    try {
      const res = await fetch(`/api/inventory/${prod.id}`);
      const json = await res.json();
      if (json.success) {
        setSelectedProduct(json.data);
        setHistoryModalOpen(true);
      }
    } catch (e) {
      toast.error('Failed to load transaction history');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Inventory & Retail Stock
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            SKU management, stock-in/out tracking, supplier purchases and low-stock alerts
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setProductModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-sm font-semibold"
        >
          Add Product
        </Button>
      </div>

      {/* Control Bar: Search & Low Stock Toggle */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by product name, SKU or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-stone-700 font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              lowStockFilter
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alert</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="h-96 bg-white rounded-2xl border border-stone-200/80 flex flex-col items-center justify-center gap-2">
          <Spinner size="md" />
          <p className="text-xs text-stone-400">Loading products & stock...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center">
          <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-stone-800">No Products in Stock</h3>
          <p className="text-xs text-stone-400 mt-1 mb-4">
            Add retail shampoos, serums, conditioners or nail art accessories
          </p>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setProductModalOpen(true);
            }}
          >
            Add Product
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-600 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3">Product Name & Category</th>
                  <th className="px-5 py-3">SKU / Barcode</th>
                  <th className="px-5 py-3">Purchase Price</th>
                  <th className="px-5 py-3">Selling Price</th>
                  <th className="px-5 py-3">Available Stock</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((prod) => {
                  const isLow = prod.stock <= prod.minStockLevel;
                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-stone-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-900">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-purple-700 font-medium">
                          {prod.category?.name}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-stone-500">
                        {prod.sku || '-'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-stone-600">
                        {formatCurrency(prod.purchasePrice)}
                      </td>
                      <td className="px-5 py-3.5 font-bold font-mono text-stone-900">
                        {formatCurrency(prod.sellingPrice)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold font-mono text-sm ${
                              isLow ? 'text-rose-600' : 'text-stone-900'
                            }`}
                          >
                            {prod.stock} {prod.unit}
                          </span>
                          {isLow && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-semibold">
                              Low Stock (≤{prod.minStockLevel})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-stone-500">
                        {prod.supplier?.name || 'Local Supplier'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setStockModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-[#7C3AED] hover:bg-purple-100 transition-colors"
                          >
                            Adjust Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenHistory(prod)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                          >
                            Logs
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(prod)}
                            className="p-1 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT PRODUCT MODAL ───────────────────────────────────── */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingId ? 'Edit Product' : 'Add Retail / Salon Product'}
        description="Configure barcode, purchase cost, customer selling price and reorder limits"
        size="lg"
      >
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          <Input
            label="Product Name *"
            placeholder="e.g. Moroccan Argan Oil Shampoo 250ml"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Product Category *"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
            <Select
              label="Supplier (Optional)"
              placeholder="-- Select Vendor --"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="SKU Code"
              placeholder="e.g. HC001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
            <Input
              label="Barcode / EAN"
              placeholder="e.g. 8901234567890"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              type="number"
              label="Purchase Cost (₹)"
              placeholder="e.g. 350"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
            <Input
              type="number"
              label="Selling Price (₹) *"
              placeholder="e.g. 650"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Initial Stock *"
              placeholder="e.g. 20"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Min Alert Level"
              placeholder="e.g. 5"
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <Button
              variant="outline"
              onClick={() => setProductModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Save Changes' : 'Add to Inventory'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── STOCK IN/OUT ADJUSTMENT MODAL ────────────────────────────── */}
      {selectedProduct && (
        <Modal
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
          title={`Adjust Stock: ${selectedProduct.name}`}
          size="sm"
        >
          <form onSubmit={handleStockAdjustment} className="space-y-4">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-400 uppercase font-semibold">Current Available:</span>
              <p className="font-bold text-base text-stone-900 mt-0.5">
                {selectedProduct.stock} {selectedProduct.unit}
              </p>
            </div>

            <Select
              label="Adjustment Action"
              value={stockAdjustmentType}
              onChange={(e: any) => setStockAdjustmentType(e.target.value)}
              options={[
                { value: 'IN', label: 'Stock IN (Purchase / Shipment Received)' },
                { value: 'OUT', label: 'Stock OUT (Salon Internal Usage / Damage)' },
                { value: 'ADJUSTMENT', label: 'Set Exact Stock (Audit Correction)' },
              ]}
            />

            <Input
              type="number"
              min="1"
              label="Quantity"
              placeholder="Enter units"
              value={adjustmentQty}
              onChange={(e) => setAdjustmentQty(e.target.value)}
              required
            />

            <Input
              label="Reason / Note"
              placeholder="e.g. Received shipment from vendor #104"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStockModalOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={submitting}>
                Confirm Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── STOCK TRANSACTION LOGS MODAL ─────────────────────────────── */}
      {selectedProduct && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`Inventory Movement Logs: ${selectedProduct.name}`}
          size="md"
        >
          <div className="space-y-3">
            <div className="max-h-60 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl text-xs">
              {selectedProduct.inventoryLogs?.length === 0 ? (
                <div className="p-4 text-center text-stone-400">
                  No stock movements recorded yet
                </div>
              ) : (
                selectedProduct.inventoryLogs?.map((log: any) => (
                  <div key={log.id} className="p-3 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                            log.type === 'IN'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {log.type}
                        </span>
                        <span className="font-semibold text-stone-800">
                          {log.reason || 'Inventory Update'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold font-mono text-stone-900 block">
                        {log.type === 'IN' ? `+${log.quantity}` : `-${log.quantity}`}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {log.previousStock} → {log.newStock}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
