'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Percent,
  Users,
  Shield,
  Save,
  Plus,
  Trash2,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'tax' | 'users'>('business');
  const [settings, setSettings] = useState<any>(null);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Business Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [invoicePrefix, setInvoicePrefix] = useState('LXS');
  const [invoiceNextNum, setInvoiceNextNum] = useState('1001');

  // Tax Modal State
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('18');
  const [newTaxDefault, setNewTaxDefault] = useState(false);

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [setRes, taxRes, userRes] = await Promise.all([
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/settings/tax').then((r) => r.json()),
        fetch('/api/settings/users').then((r) => r.json()),
      ]);

      if (setRes.success && setRes.data) {
        setSettings(setRes.data);
        setName(setRes.data.name || '');
        setAddress(setRes.data.address || '');
        setCity(setRes.data.city || '');
        setState(setRes.data.state || '');
        setZipCode(setRes.data.zipCode || '');
        setPhone(setRes.data.phone || '');
        setEmail(setRes.data.email || '');
        setGstin(setRes.data.gstin || '');
        setOpenTime(setRes.data.openTime || '09:00');
        setCloseTime(setRes.data.closeTime || '21:00');
        setInvoicePrefix(setRes.data.invoicePrefix || 'LXS');
        setInvoiceNextNum(setRes.data.invoiceNextNum?.toString() || '1001');
      }

      if (taxRes.success) setTaxes(taxRes.data);
      if (userRes.success) {
        setUsers(userRes.data.users);
        setRoles(userRes.data.roles);
        if (userRes.data.roles?.length) {
          setNewUserRole(userRes.data.roles[0].id);
        }
      }
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address,
          city,
          state,
          zipCode,
          phone,
          email,
          gstin,
          openTime,
          closeTime,
          invoicePrefix,
          invoiceNextNum: Number(invoiceNextNum),
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Salon settings updated successfully');
      } else {
        toast.error(json.error || 'Failed to update settings');
      }
    } catch (err) {
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTaxName,
          rate: Number(newTaxRate),
          isDefault: newTaxDefault,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Tax rate added');
        setTaxModalOpen(false);
        setNewTaxName('');
        setNewTaxRate('18');
        setNewTaxDefault(false);
        fetchSettings();
      } else {
        toast.error(json.error || 'Failed to add tax rate');
      }
    } catch (err) {
      toast.error('Error adding tax');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          phone: newUserPhone,
          roleId: newUserRole,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Staff user account created');
        setUserModalOpen(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserPhone('');
        fetchSettings();
      } else {
        toast.error(json.error || 'Failed to create user');
      }
    } catch (err) {
      toast.error('Error creating user');
    }
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-stone-500 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Settings & Workspace Administration
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Studio business profile, GST tax rates, operational timings and user account security
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 -mb-px transition-all ${
            activeTab === 'business'
              ? 'border-[#7C3AED] text-[#7C3AED]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Business & Hours</span>
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 -mb-px transition-all ${
            activeTab === 'tax'
              ? 'border-[#7C3AED] text-[#7C3AED]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>GST & Taxes</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 -mb-px transition-all ${
            activeTab === 'users'
              ? 'border-[#7C3AED] text-[#7C3AED]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Users & Roles</span>
        </button>
      </div>

      {/* Tab 1: Business Profile & Hours */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusiness} className="space-y-6">
          <Card title="Salon Profile & Branding">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Salon Legal Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="GSTIN Identification Number"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="29ABCDE1234F1Z5"
              />
              <Input
                label="Business Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Official Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mt-4">
              <Input
                label="Salon Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <Input
                label="Postal / Zip Code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
          </Card>

          <Card title="Timings & Invoice Configuration">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="time"
                label="Salon Daily Opening Time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />
              <Input
                type="time"
                label="Salon Daily Closing Time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
              />
              <Input
                label="Invoice Prefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
              />
              <Input
                type="number"
                label="Next Sequential Invoice #"
                value={invoiceNextNum}
                onChange={(e) => setInvoiceNextNum(e.target.value)}
              />
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={saving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Salon Configuration
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: GST & Taxes */}
      {activeTab === 'tax' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              Configurable GST & Service Tax Tiers
            </h3>
            <Button
              size="sm"
              onClick={() => setTaxModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Tax Rate
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {taxes.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-stone-900">{t.name}</h4>
                  <span className="text-lg font-bold text-[#7C3AED] font-mono block mt-1">
                    {t.rate}%
                  </span>
                </div>
                {t.isDefault && (
                  <Badge variant="purple" size="sm">
                    Default
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Users & Roles */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              Authorized Staff Users & Access Roles
            </h3>
            <Button
              size="sm"
              onClick={() => setUserModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Staff User
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 font-semibold text-stone-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/60">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-stone-900">{u.name}</div>
                      <div className="text-stone-400">{u.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="purple" size="sm">
                        {u.role?.name || 'Staff'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      {u.phone || '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="success" size="sm">
                        Active
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ADD TAX MODAL ───────────────────────────────────────────── */}
      <Modal
        isOpen={taxModalOpen}
        onClose={() => setTaxModalOpen(false)}
        title="Add Tax Setting"
        size="sm"
      >
        <form onSubmit={handleAddTax} className="space-y-4">
          <Input
            label="Tax Name *"
            placeholder="e.g. GST 28%"
            value={newTaxName}
            onChange={(e) => setNewTaxName(e.target.value)}
            required
          />
          <Input
            type="number"
            label="Tax Rate (%) *"
            placeholder="e.g. 28"
            value={newTaxRate}
            onChange={(e) => setNewTaxRate(e.target.value)}
            required
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="taxDefault"
              checked={newTaxDefault}
              onChange={(e) => setNewTaxDefault(e.target.checked)}
              className="rounded border-stone-300 text-[#7C3AED]"
            />
            <label htmlFor="taxDefault" className="text-xs text-stone-700">
              Set as default tax rate for services & products
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTaxModalOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Save Tax Tier
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── ADD USER MODAL ──────────────────────────────────────────── */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Create Staff User"
        size="md"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              placeholder="e.g. Maya Iyer"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              required
            />
            <Input
              type="email"
              label="Email Address *"
              placeholder="maya@salon.com"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="password"
              label="Password *"
              placeholder="••••••••"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              required
            />
            <Select
              label="Access Role *"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              options={roles.map((r) => ({
                value: r.id,
                label: `${r.name} (${r.description})`,
              }))}
              required
            />
          </div>

          <Input
            label="Mobile Phone"
            placeholder="+91 9988776655"
            value={newUserPhone}
            onChange={(e) => setNewUserPhone(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserModalOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
