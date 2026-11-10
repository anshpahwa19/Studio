'use client';

import React from 'react';
import {
  Calendar,
  IndianRupee,
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface StatsCardsProps {
  stats: {
    todayAppointmentsCount: number;
    completedToday: number;
    confirmedToday: number;
    inProgressToday: number;
    cancelledToday: number;
    totalRevenue: number;
    totalCustomers: number;
    newCustomers: number;
    pendingPayments: number;
  };
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: "Today's Appointments",
      value: stats.todayAppointmentsCount,
      subtext: `${stats.completedToday} completed • ${stats.inProgressToday} in progress`,
      icon: Calendar,
      badge: 'Live Today',
      badgeColor: 'text-purple-700 bg-purple-50 border-purple-100',
      iconColor: 'text-purple-600 bg-purple-50/80 border-purple-100 group-hover:bg-purple-600 group-hover:text-white',
    },
    {
      title: 'Total Revenue Collected',
      value: formatCurrency(stats.totalRevenue),
      subtext: 'Settled via UPI, Cash & Cards',
      icon: IndianRupee,
      badge: '+18.4% MoM',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-100',
      iconColor: 'text-emerald-600 bg-emerald-50/80 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
    },
    {
      title: 'Total Active Clients',
      value: stats.totalCustomers,
      subtext: 'Registered CRM client profiles',
      icon: Users,
      badge: 'Client Base',
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-100',
      iconColor: 'text-blue-600 bg-blue-50/80 border-blue-100 group-hover:bg-blue-600 group-hover:text-white',
    },
    {
      title: 'New Clients (30 Days)',
      value: `+${stats.newCustomers}`,
      subtext: 'New client acquisition rate',
      icon: UserPlus,
      badge: 'Growth',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-100',
      iconColor: 'text-amber-600 bg-amber-50/80 border-amber-100 group-hover:bg-amber-600 group-hover:text-white',
    },
    {
      title: 'Pending Balances',
      value: formatCurrency(stats.pendingPayments),
      subtext: 'Customer receivables to collect',
      icon: Clock,
      badge: 'Receivables',
      badgeColor: 'text-rose-700 bg-rose-50 border-rose-100',
      iconColor: 'text-rose-600 bg-rose-50/80 border-rose-100 group-hover:bg-rose-600 group-hover:text-white',
    },
    {
      title: 'Completed Sessions',
      value: stats.completedToday,
      subtext: 'Successfully delivered today',
      icon: CheckCircle2,
      badge: 'Delivered',
      badgeColor: 'text-teal-700 bg-teal-50 border-teal-100',
      iconColor: 'text-teal-600 bg-teal-50/80 border-teal-100 group-hover:bg-teal-600 group-hover:text-white',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="group relative bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  {card.title}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${card.badgeColor}`}
                >
                  {card.badge}
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-sans">
                  {card.value}
                </h3>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-all duration-200 shadow-sm ${card.iconColor}`}
                >
                  <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-500 font-medium flex items-center justify-between">
              <span>{card.subtext}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-purple-600 transition-colors" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
