'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  Users,
  Scissors,
  UserCheck,
  Package,
  Wallet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Billing & POS', href: '/billing', icon: Receipt },
  { name: 'Customers (CRM)', href: '/customers', icon: Users },
  { name: 'Services & Pricing', href: '/services', icon: Scissors },
  { name: 'Staff Management', href: '/staff', icon: UserCheck },
  { name: 'Inventory & Stock', href: '/inventory', icon: Package },
  { name: 'Expenses', href: '/expenses', icon: Wallet },
  { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
  { name: 'Settings & Users', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen bg-white border-r border-stone-200/80 flex flex-col transition-all duration-300 ease-in-out select-none shadow-sm lg:shadow-none',
          collapsed ? 'w-[76px]' : 'w-[264px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-stone-100">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-white shrink-0 shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 transform -rotate-45" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-stone-900 text-sm leading-tight tracking-tight truncate" title="Shruti Pahwa">
                  Shruti Pahwa
                </span>
                <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider truncate">
                  Luxury Salon & Academy
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Toggle for Desktop */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 items-center justify-center transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Operations & Management
            </div>
          )}

          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-purple-50 text-[#7C3AED] font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive
                      ? 'text-[#7C3AED]'
                      : 'text-stone-400 group-hover:text-stone-700'
                  )}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}

                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#7C3AED] rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* User Profile Card & Logout */}
        <div className="p-3 border-t border-stone-100 bg-stone-50/50">
          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-xl transition-colors',
              collapsed ? 'justify-center' : 'justify-between'
            )}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {session?.user?.name
                  ? session.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'AD'}
              </div>
              {!collapsed && (
                <div className="truncate text-left">
                  <div className="text-xs font-semibold text-stone-900 truncate">
                    {session?.user?.name || 'Admin'}
                  </div>
                  <div className="text-[10px] text-purple-600 font-medium capitalize">
                    {session?.user?.role || 'Owner'}
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
