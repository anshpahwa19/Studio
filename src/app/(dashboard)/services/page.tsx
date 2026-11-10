'use client';

import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Plus,
  Search,
  Clock,
  IndianRupee,
  Edit2,
  Trash2,
  FolderPlus,
  Sparkles,
  Tag,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Service Form State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [taxSettingId, setTaxSettingId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Category Form State
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  // Fetch Services & Categories
  const fetchData = async () => {
    setLoading(true);
    try {
      const [svcRes, catRes, taxRes] = await Promise.all([
        fetch('/api/services').then((r) => r.json()),
        fetch('/api/services/categories').then((r) => r.json()),
        fetch('/api/settings/tax').then((r) => r.json()),
      ]);

      if (svcRes.success) setServices(svcRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (taxRes.success) setTaxes(taxRes.data);
    } catch (err) {
      toast.error('Failed to load services data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetServiceForm = () => {
    setEditingServiceId(null);
    setName('');
    setDescription('');
    setCategoryId(categories[0]?.id || '');
    setPrice('');
    setDuration('30');
    setTaxSettingId('');
    setIsActive(true);
  };

  const handleEditService = (svc: any) => {
    setEditingServiceId(svc.id);
    setName(svc.name);
    setDescription(svc.description || '');
    setCategoryId(svc.categoryId);
    setPrice(svc.price.toString());
    setDuration(svc.duration.toString());
    setTaxSettingId(svc.taxSettingId || '');
    setIsActive(svc.isActive);
    setServiceModalOpen(true);
  };

  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingServiceId
        ? `/api/services/${editingServiceId}`
        : '/api/services';
      const method = editingServiceId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          categoryId,
          price: Number(price),
          duration: Number(duration),
          taxSettingId: taxSettingId || null,
          isActive,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingServiceId ? 'Service updated' : 'New service created');
        setServiceModalOpen(false);
        resetServiceForm();
        fetchData();
      } else {
        toast.error(json.error || 'Failed to save service');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to archive this service?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Service archived');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to archive service');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/services/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Service category created');
        setCategoryModalOpen(false);
        setCategoryName('');
        setCategoryDescription('');
        fetchData();
      } else {
        toast.error(json.error || 'Failed to create category');
      }
    } catch (err) {
      toast.error('Error creating category');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter services
  const filteredServices = services.filter((s) => {
    const matchesCategory =
      selectedCategory === 'all' || s.categoryId === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Services & Pricing Menu
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Haircuts, hair treatments, coloring, manicures, pedicures and nail extensions
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
              resetServiceForm();
              setServiceModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm font-semibold"
          >
            Add Service
          </Button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
            selectedCategory === 'all'
              ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm'
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
          }`}
        >
          All Services ({services.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategory === cat.id
                ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
            }`}
          >
            {cat.name} ({cat._count?.services || 0})
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search service name or treatment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>

        <span className="text-xs text-stone-500 font-medium hidden sm:block">
          Showing <strong>{filteredServices.length}</strong> services
        </span>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="h-96 bg-white rounded-2xl border border-stone-200/80 flex flex-col items-center justify-center gap-2">
          <Spinner size="md" />
          <p className="text-xs text-stone-400">Loading salon services...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center">
          <Scissors className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-stone-800">No Services Found</h3>
          <p className="text-xs text-stone-400 mt-1 mb-4">
            Add your first custom service or adjust your category filter
          </p>
          <Button
            size="sm"
            onClick={() => {
              resetServiceForm();
              setServiceModalOpen(true);
            }}
          >
            Create Service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:shadow-md hover:border-purple-200 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="purple" size="sm">
                    {svc.category?.name}
                  </Badge>
                  <span className="text-xs text-stone-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{svc.duration} mins</span>
                  </span>
                </div>

                <h4 className="text-base font-bold text-stone-900 group-hover:text-[#7C3AED] transition-colors">
                  {svc.name}
                </h4>

                <p className="text-xs text-stone-500 mt-1 line-clamp-2 min-h-[32px]">
                  {svc.description || 'Professional styling service using premium salon products.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-stone-900 font-mono">
                    {formatCurrency(svc.price)}
                  </span>
                  {svc.taxSetting && (
                    <span className="text-[10px] text-stone-400 block">
                      + {svc.taxSetting.name} ({svc.taxSetting.rate}%)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEditService(svc)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                    title="Edit Service"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteService(svc.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Archive Service"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── ADD/EDIT SERVICE MODAL ──────────────────────────────────── */}
      <Modal
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        title={editingServiceId ? 'Edit Service' : 'Add New Salon Service'}
        description="Configure pricing, estimated duration, category and tax settings"
        size="md"
      >
        <form onSubmit={handleSubmitService} className="space-y-4">
          <Input
            label="Service Name *"
            placeholder="e.g. Balayage Hair Colouring"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label="Service Category *"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label="Standard Price (₹) *"
              placeholder="e.g. 1500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Duration (Minutes) *"
              placeholder="e.g. 45"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <Select
            label="Applicable GST / Tax Rate"
            value={taxSettingId}
            onChange={(e) => setTaxSettingId(e.target.value)}
            placeholder="-- Default (GST 18%) --"
            options={taxes.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.rate}%)`,
            }))}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Service Description
            </label>
            <textarea
              rows={2}
              placeholder="Describe treatment steps, included hair wash, blowout, or aftercare tips..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <Button
              variant="outline"
              onClick={() => setServiceModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingServiceId ? 'Save Changes' : 'Create Service'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── ADD CATEGORY MODAL ───────────────────────────────────────── */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Add Service Category"
        size="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            label="Category Name *"
            placeholder="e.g. Bridal Packages"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
          />
          <Input
            label="Description (Optional)"
            placeholder="e.g. Premium bridal styling and makeup"
            value={categoryDescription}
            onChange={(e) => setCategoryDescription(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={submitting}>
              Add Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
