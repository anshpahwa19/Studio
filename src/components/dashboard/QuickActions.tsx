'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarPlus, Receipt, UserPlus, Wallet, ArrowRight, Sparkles } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      title: 'Book Appointment',
      subtitle: 'Schedule client visit with stylist',
      badge: 'Calendar',
      href: '/appointments?action=new',
      icon: CalendarPlus,
      gradient: 'from-purple-500 to-indigo-600',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100/80 group-hover:bg-purple-600 group-hover:text-white',
      accentHover: 'hover:border-purple-300 hover:shadow-purple-500/5',
    },
    {
      title: 'Create POS Bill',
      subtitle: 'Fast checkout, GST bill & receipt',
      badge: 'Point of Sale',
      href: '/billing?action=new',
      icon: Receipt,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100/80 group-hover:bg-emerald-600 group-hover:text-white',
      accentHover: 'hover:border-emerald-300 hover:shadow-emerald-500/5',
    },
    {
      title: 'Add New Client',
      subtitle: 'Client profile & styling notes',
      badge: 'CRM',
      href: '/customers?action=new',
      icon: UserPlus,
      gradient: 'from-blue-500 to-cyan-600',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100/80 group-hover:bg-blue-600 group-hover:text-white',
      accentHover: 'hover:border-blue-300 hover:shadow-blue-500/5',
    },
    {
      title: 'Record Expense',
      subtitle: 'Supplies, rent & daily payouts',
      badge: 'Finance',
      href: '/expenses?action=new',
      icon: Wallet,
      gradient: 'from-rose-500 to-pink-600',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100/80 group-hover:bg-rose-600 group-hover:text-white',
      accentHover: 'hover:border-rose-300 hover:shadow-rose-500/5',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((act, idx) => {
        const Icon = act.icon;
        return (
          <Link
            key={idx}
            href={act.href}
            className={`group relative bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between ${act.accentHover}`}
          >
            <div>
              {/* Top row with icon and badge */}
              <div className="flex items-center justify-between mb-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-200 shadow-sm ${act.iconBg}`}
                >
                  <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200/60 group-hover:border-stone-300 transition-colors">
                  {act.badge}
                </span>
              </div>

              {/* Title & Description */}
              <h4 className="text-sm font-bold text-stone-900 group-hover:text-[#7C3AED] transition-colors leading-tight">
                {act.title}
              </h4>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                {act.subtitle}
              </p>
            </div>

            {/* Bottom action link */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-400 group-hover:text-[#7C3AED] transition-colors">
              <span>Open action</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
};
