'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Scissors,
  Sparkles,
  Edit2,
  Trash2,
  Clock,
  Award,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function StaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Female');
  const [role, setRole] = useState('Senior Stylist');
  const [commissionRate, setCommissionRate] = useState('25');
  const [specializations, setSpecializations] = useState<string[]>([]);

  const allSpecializations = [
    'Haircut',
    'Hair Colouring',
    'Hair Spa',
    'Hair Styling',
    'Beard Grooming',
    'Manicure',
    'Pedicure',
    'Nail Art',
    'Nail Extensions',
    'Gel Nails',
  ];

  const fetchStaff = async () => {
    setLoading(true);
    try {
      let url = '/api/staff';
      if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setStaffList(json.data);
      }
    } catch (err) {
      toast.error('Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [searchQuery]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setGender('Female');
    setRole('Senior Stylist');
    setCommissionRate('25');
    setSpecializations([]);
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setName(s.name);
    setPhone(s.phone);
    setEmail(s.email || '');
    setGender(s.gender || 'Female');
    setRole(s.role);
    setCommissionRate(s.commissionRate?.toString() || '0');

    let specs: string[] = [];
    if (s.specializations) {
      try {
        specs = JSON.parse(s.specializations);
      } catch (e) {
        specs = [];
      }
    }
    setSpecializations(specs);
    setCreateModalOpen(true);
  };

  const toggleSpecialization = (spec: string) => {
    if (specializations.includes(spec)) {
      setSpecializations(specializations.filter((s) => s !== spec));
    } else {
      setSpecializations([...specializations, spec]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingId ? `/api/staff/${editingId}` : '/api/staff';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          gender,
          role,
          commissionRate: Number(commissionRate),
          specializations,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? 'Staff updated' : 'Staff member added');
        setCreateModalOpen(false);
        resetForm();
        fetchStaff();
      } else {
        toast.error(json.error || 'Failed to save staff');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to archive this staff member?')) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Staff archived');
        fetchStaff();
      }
    } catch (err) {
      toast.error('Failed to archive staff');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Staff & Stylist Roster
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Stylist profiles, specializations, working schedules and commission configurations
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
          Add Staff Member
        </Button>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, role or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>

        <span className="text-xs text-stone-500 font-medium hidden sm:block">
          Active Roster: <strong>{staffList.length} members</strong>
        </span>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="h-96 bg-white rounded-2xl border border-stone-200/80 flex flex-col items-center justify-center gap-2">
          <Spinner size="md" />
          <p className="text-xs text-stone-400">Loading staff members...</p>
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center">
          <UserCheck className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-stone-800">No Staff Members</h3>
          <p className="text-xs text-stone-400 mt-1 mb-4">
            Add stylists and nail artists to assign them to appointments
          </p>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
          >
            Add Staff Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((s) => {
            let specs: string[] = [];
            if (s.specializations) {
              try {
                specs = JSON.parse(s.specializations);
              } catch (e) {
                specs = [];
              }
            }

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:shadow-md hover:border-purple-200 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top: Avatar, Name & Role */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                        {s.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-stone-900 group-hover:text-[#7C3AED] transition-colors leading-tight">
                          {s.name}
                        </h4>
                        <span className="text-xs text-purple-700 font-semibold block mt-0.5">
                          {s.role}
                        </span>
                      </div>
                    </div>

                    <Badge variant="purple" size="sm">
                      {s.commissionRate}% Comm.
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 text-xs text-stone-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>{s.phone}</span>
                    </div>
                    {s.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-stone-400" />
                        <span>{s.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Specializations Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {specs.map((sp, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md border border-stone-200/60"
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer: Appointment Stats & Actions */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">
                    Appointments: <strong className="text-stone-900">{s._count?.appointments || 0}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(s)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                      title="Edit Staff"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Archive Staff"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ADD/EDIT STAFF MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingId ? 'Edit Staff Profile' : 'Add Staff Member'}
        description="Profile details, role, commission percentage and services assigned"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Staff Full Name *"
              placeholder="e.g. Rahul Mehra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Mobile Phone *"
              placeholder="e.g. +91 9988776601"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="rahul@salon.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              label="Staff Role *"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'Senior Stylist', label: 'Senior Stylist' },
                { value: 'Stylist', label: 'Stylist' },
                { value: 'Junior Stylist', label: 'Junior Stylist' },
                { value: 'Senior Nail Artist', label: 'Senior Nail Artist' },
                { value: 'Nail Technician', label: 'Nail Technician' },
                { value: 'Salon Manager', label: 'Salon Manager' },
              ]}
            />
            <Input
              type="number"
              label="Commission Rate (%) *"
              placeholder="e.g. 25"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              required
            />
          </div>

          {/* Specializations Multi-select */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
              Stylist Skills & Specializations
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allSpecializations.map((spec) => {
                const isSelected = specializations.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialization(spec)}
                    className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? 'bg-purple-50 border-[#7C3AED] text-[#7C3AED] font-semibold'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {spec}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? 'Save Changes' : 'Add Staff Member'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
