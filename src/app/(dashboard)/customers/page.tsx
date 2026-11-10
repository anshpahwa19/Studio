'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  Receipt,
  Scissors,
  Sparkles,
  Edit2,
  Trash2,
  UserCheck,
  Heart,
  ChevronRight,
  Clock,
  IndianRupee,
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

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Female');
  const [address, setAddress] = useState('');
  const [hairPreferences, setHairPreferences] = useState('');
  const [nailPreferences, setNailPreferences] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredStaffId, setPreferredStaffId] = useState('');

  // Check URL params for action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      resetForm();
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  // Load staff for preferred stylist selector
  useEffect(() => {
    fetch('/api/staff')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStaffList(d.data);
      });
  }, []);

  // Fetch Customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = '/api/customers?limit=100';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
      }
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  // View Customer Profile with Appointments and Billing history
  const handleOpenProfile = async (cust: any) => {
    setSelectedCustomer(cust);
    setProfileModalOpen(true);
    setLoadingProfile(true);

    try {
      const res = await fetch(`/api/customers/${cust.id}`);
      const json = await res.json();
      if (json.success) {
        setCustomerDetails(json.data);
      }
    } catch (err) {
      toast.error('Failed to load client profile details');
    } finally {
      setLoadingProfile(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setGender('Female');
    setAddress('');
    setHairPreferences('');
    setNailPreferences('');
    setNotes('');
    setPreferredStaffId('');
  };

  const handleEditCustomer = (cust: any) => {
    setEditingId(cust.id);
    setName(cust.name || '');
    setPhone(cust.phone || '');
    setEmail(cust.email || '');
    setGender(cust.gender || 'Female');
    setAddress(cust.address || '');
    setHairPreferences(cust.hairPreferences || '');
    setNailPreferences(cust.nailPreferences || '');
    setNotes(cust.notes || '');
    setPreferredStaffId(cust.preferredStaffId || '');
    setCreateModalOpen(true);
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          gender,
          address,
          hairPreferences,
          nailPreferences,
          notes,
          preferredStaffId: preferredStaffId || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? 'Client profile updated' : 'Client registered successfully');
        setCreateModalOpen(false);
        resetForm();
        fetchCustomers();
      } else {
        toast.error(json.error || 'Failed to save customer');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Customer Relationship Management (CRM)
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Client profiles, treatment histories, hair & nail styling preferences, and lifetime spending
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setCreateModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-sm font-semibold"
        >
          Add New Client
        </Button>
      </div>

      {/* Search and Stats Ribbon */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by client name, mobile or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>

        <div className="text-xs text-stone-500 font-medium">
          Total Registered: <strong className="text-stone-900">{customers.length} clients</strong>
        </div>
      </div>

      {/* Customers Cards Grid */}
      {loading ? (
        <div className="h-96 bg-white rounded-2xl border border-stone-200/80 flex flex-col items-center justify-center gap-2">
          <Spinner size="md" />
          <p className="text-xs text-stone-400">Loading client directory...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center">
          <Users className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-stone-800">No Clients Found</h3>
          <p className="text-xs text-stone-400 mt-1 mb-4">
            Register your first client to start booking appointments and managing history
          </p>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
          >
            Add New Client
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((cust) => (
            <div
              key={cust.id}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:shadow-md hover:border-purple-200 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: Name & Gender */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                      {cust.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-stone-900 group-hover:text-[#7C3AED] transition-colors leading-tight">
                        {cust.name}
                      </h4>
                      <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-stone-400" />
                        <span>{cust.phone}</span>
                      </p>
                    </div>
                  </div>

                  <Badge variant="purple" size="sm">
                    {cust.visitCount || 0} visits
                  </Badge>
                </div>

                {/* Lifetime Spending & Stylist */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                      Lifetime Spend
                    </span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      {formatCurrency(cust.totalSpent || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                      Preferred Stylist
                    </span>
                    <span className="font-semibold text-stone-800 truncate block">
                      {cust.preferredStaff?.name || 'Any Stylist'}
                    </span>
                  </div>
                </div>

                {/* Preferences Highlights */}
                {(cust.hairPreferences || cust.nailPreferences) && (
                  <div className="mt-3 text-xs text-stone-600 space-y-1">
                    {cust.hairPreferences && (
                      <p className="truncate text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                        💇 <strong>Hair:</strong> {cust.hairPreferences}
                      </p>
                    )}
                    {cust.nailPreferences && (
                      <p className="truncate text-[11px] text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md">
                        💅 <strong>Nail:</strong> {cust.nailPreferences}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpenProfile(cust)}
                  className="text-xs font-semibold text-[#7C3AED] hover:underline flex items-center gap-1"
                >
                  <span>View History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/appointments?action=new&customerId=${cust.id}`)
                    }
                    className="p-1.5 rounded-lg text-stone-400 hover:text-[#7C3AED] hover:bg-purple-50 transition-colors"
                    title="Book Appointment"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/billing?action=new&customerId=${cust.id}`)
                    }
                    className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Create Bill"
                  >
                    <Receipt className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditCustomer(cust)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── ADD/EDIT CLIENT MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingId ? 'Edit Client Profile' : 'Register New Client'}
        description="Client contact info, preferences, hair/nail styling records and notes"
        size="lg"
      >
        <form onSubmit={handleSubmitCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              placeholder="e.g. Meera Joshi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Phone Number *"
              placeholder="e.g. +91 9900110001"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="client@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={[
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            <SearchableSelect
              label="Preferred Artist / Stylist"
              placeholder="-- No Preference --"
              searchPlaceholder="Search artist by name or role..."
              value={preferredStaffId}
              onChange={(val) => setPreferredStaffId(val)}
              options={staffList.map((s) => ({
                value: s.id,
                label: s.name,
                sublabel: s.role,
                badge: s.role,
              }))}
              clearable
            />
          </div>

          <Input
            label="Address (Optional)"
            placeholder="e.g. Indiranagar, Bengaluru"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-700 mb-1">
                💇 Hair Preferences & Treatment Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Layers, warm tones, ammonia-free color only, Keratin every 3 months"
                value={hairPreferences}
                onChange={(e) => setHairPreferences(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-pink-700 mb-1">
                💅 Nail Preferences & Design Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. French tips, nude gel polish, almond shape extensions"
                value={nailPreferences}
                onChange={(e) => setNailPreferences(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>
          </div>

          <Input
            label="General Client Notes (VIP, Allergy Alerts, etc.)"
            placeholder="e.g. VIP client, prefers morning slot, allergic to standard hair bleach"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Save Changes' : 'Register Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── CLIENT PROFILE & 360 HISTORY MODAL ──────────────────────── */}
      {selectedCustomer && (
        <Modal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          title={`Client Profile: ${selectedCustomer.name}`}
          size="xl"
        >
          {loadingProfile ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2">
              <Spinner size="md" />
              <p className="text-xs text-stone-400">Loading client history...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="bg-gradient-to-r from-purple-50/60 to-indigo-50/60 p-4 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {customerDetails?.name || selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Phone: {customerDetails?.phone} • Email: {customerDetails?.email || 'N/A'}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Client since {formatDate(customerDetails?.createdAt || new Date())}
                  </p>
                </div>

                <div className="text-right bg-white px-4 py-2.5 rounded-xl border border-purple-100 shadow-sm">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                    Total Lifetime Spend
                  </span>
                  <span className="text-lg font-bold text-[#7C3AED] font-mono">
                    {formatCurrency(customerDetails?.totalSpent || 0)}
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    {customerDetails?.appointments?.length || 0} visits completed
                  </span>
                </div>
              </div>

              {/* Preferences Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                  <span className="font-bold text-purple-900 block mb-1">
                    💇 Hair Styling Preferences
                  </span>
                  <p className="text-purple-800">
                    {customerDetails?.hairPreferences || 'No specific preferences logged'}
                  </p>
                </div>
                <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100">
                  <span className="font-bold text-pink-900 block mb-1">
                    💅 Nail Art & Extension Preferences
                  </span>
                  <p className="text-pink-800">
                    {customerDetails?.nailPreferences || 'No specific preferences logged'}
                  </p>
                </div>
              </div>

              {/* Appointment History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Appointment History ({customerDetails?.appointments?.length || 0})
                </h4>
                <div className="max-h-44 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl text-xs">
                  {customerDetails?.appointments?.length === 0 ? (
                    <div className="p-4 text-center text-stone-400">
                      No appointment records yet
                    </div>
                  ) : (
                    customerDetails?.appointments?.map((appt: any) => (
                      <div key={appt.id} className="p-3 bg-white flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-stone-900">
                            {formatDate(appt.date)} ({appt.startTime})
                          </div>
                          <div className="text-[11px] text-stone-500">
                            Stylist: {appt.staff?.name} •{' '}
                            {appt.services?.map((s: any) => s.service?.name).join(', ')}
                          </div>
                        </div>
                        <Badge variant="primary" size="sm">
                          {appt.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Billing History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Invoice & Billing Records ({customerDetails?.invoices?.length || 0})
                </h4>
                <div className="max-h-44 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl text-xs">
                  {customerDetails?.invoices?.length === 0 ? (
                    <div className="p-4 text-center text-stone-400">
                      No invoice records yet
                    </div>
                  ) : (
                    customerDetails?.invoices?.map((inv: any) => (
                      <div key={inv.id} className="p-3 bg-white flex items-center justify-between">
                        <div>
                          <div className="font-mono font-bold text-stone-900">
                            {inv.invoiceNumber}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            {formatDate(inv.createdAt)} • {inv.items?.length} items
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-stone-900 block">
                            {formatCurrency(inv.totalAmount)}
                          </span>
                          <span className="text-[11px] text-emerald-600">
                            Paid: {formatCurrency(inv.paidAmount)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer Quick Launch */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setProfileModalOpen(false);
                    router.push(`/appointments?action=new&customerId=${selectedCustomer.id}`);
                  }}
                  leftIcon={<Calendar className="w-3.5 h-3.5" />}
                >
                  Book Appointment
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setProfileModalOpen(false);
                    router.push(`/billing?action=new&customerId=${selectedCustomer.id}`);
                  }}
                  leftIcon={<Receipt className="w-3.5 h-3.5" />}
                >
                  Create Bill
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
