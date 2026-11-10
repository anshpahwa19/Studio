'use client';

import React, { useEffect, useState } from 'react';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { AppointmentOverview } from '@/components/dashboard/AppointmentOverview';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Sparkles, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-stone-500 font-medium tracking-wide">
          Loading studio operations data...
        </p>
      </div>
    );
  }

  const defaultStats = {
    todayAppointmentsCount: 0,
    completedToday: 0,
    confirmedToday: 0,
    inProgressToday: 0,
    cancelledToday: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    newCustomers: 0,
    pendingPayments: 0,
  };

  const stats = data?.stats || defaultStats;
  const revenueChart = data?.revenueChart || [];
  const recentTransactions = data?.recentTransactions || [];
  const upcomingAppointments = data?.upcomingAppointments || [];

  return (
    <div className="space-y-6">
      {/* Top Banner with Studio Status, Date & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              Shruti Pahwa Luxury Salon & Academy
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Studio Open</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-500 font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>{format(new Date(), 'EEEE, dd MMMM yyyy')}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>Hours: 09:00 AM – 09:00 PM</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            className="shadow-sm"
          >
            Sync Data
          </Button>
        </div>
      </div>

      {/* Quick Launchpad (Fixed UI & Redesigned) */}
      <QuickActions />

      {/* Metric Cards */}
      <StatsCards stats={stats} />

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueChart} />
        </div>
        <div className="lg:col-span-1">
          <AppointmentOverview stats={stats} />
        </div>
      </div>

      {/* Operational Feeds: Upcoming Bookings & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingAppointments appointments={upcomingAppointments} />
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </div>
  );
}
