'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Search,
  Plus,
  Calendar,
  Receipt,
  UserPlus,
  Scissors,
  LogOut,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { signOut, useSession } from 'next-auth/react';

interface TopBarProps {
  onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [quickOpen, setQuickOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Map path to title
  const getPageInfo = () => {
    if (pathname.includes('/dashboard'))
      return { title: 'Executive Dashboard', subtitle: 'Overview & Real-time Metrics' };
    if (pathname.includes('/appointments'))
      return { title: 'Appointments Calendar', subtitle: 'Bookings, Scheduling & Roster' };
    if (pathname.includes('/billing'))
      return { title: 'Point of Sale & Invoicing', subtitle: 'Fast Checkout, GST & Payments' };
    if (pathname.includes('/customers'))
      return { title: 'Customer Relationship (CRM)', subtitle: 'Client Profiles & Service History' };
    if (pathname.includes('/services'))
      return { title: 'Services & Pricing Menu', subtitle: 'Hair, Nails, Spa & Packages' };
    if (pathname.includes('/staff'))
      return { title: 'Staff & Stylist Management', subtitle: 'Schedules, Commission & Roster' };
    if (pathname.includes('/inventory'))
      return { title: 'Inventory & Retail Stock', subtitle: 'SKU Tracking, Purchases & Alerts' };
    if (pathname.includes('/expenses'))
      return { title: 'Business Expenses & Payouts', subtitle: 'Daily Expenses, Rent & Vendors' };
    if (pathname.includes('/reports'))
      return { title: 'Financial & Business Analytics', subtitle: 'Sales, Profitability & Trends' };
    if (pathname.includes('/settings'))
      return { title: 'Studio Settings & Access', subtitle: 'GSTIN, Users, Hours & Branding' };
    return { title: 'Salon Studio', subtitle: 'Management Suite' };
  };

  const { title, subtitle } = getPageInfo();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/customers?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-stone-200/80 px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-stone-900 leading-tight tracking-tight">
            {title}
          </h1>
          <p className="hidden sm:block text-[11px] text-stone-500 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search, Quick Action, Notifications, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search */}
        <form onSubmit={handleSearch} className="hidden md:flex relative items-center w-60">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search clients, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs text-stone-900 bg-stone-50 border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] focus:bg-white transition-all"
          />
        </form>

        {/* Quick Action Dropdown */}
        <div className="relative">
          <Button
            size="sm"
            onClick={() => setQuickOpen(!quickOpen)}
            leftIcon={<Plus className="w-4 h-4" />}
            rightIcon={<ChevronDown className="w-3.5 h-3.5 opacity-80" />}
            className="shadow-sm font-semibold"
          >
            <span className="hidden sm:inline">Quick Action</span>
            <span className="sm:hidden">New</span>
          </Button>

          {quickOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setQuickOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  Quick Create
                </div>
                <Link
                  href="/appointments?action=new"
                  onClick={() => setQuickOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-purple-50 hover:text-[#7C3AED] transition-colors"
                >
                  <Calendar className="w-4 h-4 text-[#7C3AED]" />
                  <span>Book Appointment</span>
                </Link>
                <Link
                  href="/billing?action=new"
                  onClick={() => setQuickOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-purple-50 hover:text-[#7C3AED] transition-colors"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>New Invoice / POS Bill</span>
                </Link>
                <Link
                  href="/customers?action=new"
                  onClick={() => setQuickOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-purple-50 hover:text-[#7C3AED] transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>Add New Customer</span>
                </Link>
                <Link
                  href="/expenses?action=new"
                  onClick={() => setQuickOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-purple-50 hover:text-[#7C3AED] transition-colors"
                >
                  <Receipt className="w-4 h-4 text-rose-600" />
                  <span>Record Expense</span>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-600 rounded-full ring-2 ring-white" />
          </button>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
              {session?.user?.name
                ? session.user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'AD'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-stone-100">
                  <p className="text-xs font-semibold text-stone-900 truncate">
                    {session?.user?.name || 'Administrator'}
                  </p>
                  <p className="text-[10px] text-stone-500 truncate">
                    {session?.user?.email || 'admin@salon.com'}
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-stone-400" />
                  <span>Settings & Profile</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    signOut({ callbackUrl: '/login' });
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors border-t border-stone-100"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
