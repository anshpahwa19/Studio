'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  IndianRupee,
  Scissors,
  Users,
  Wallet,
  Calendar,
  CheckCircle2,
  PieChart as PieIcon,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('monthly');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
      }
    } catch (err) {
      toast.error('Failed to load financial reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'FINANCIAL REPORT OVERVIEW\n';
    csvContent += `Period,${period.toUpperCase()}\n`;
    csvContent += `Total Sales,${reportData.summary?.totalSales}\n`;
    csvContent += `Total Collected,${reportData.summary?.totalCollected}\n`;
    csvContent += `Total Expenses,${reportData.summary?.totalExpenses}\n`;
    csvContent += `Net Profit,${reportData.summary?.netProfit}\n`;
    csvContent += `Outstanding Payments,${reportData.summary?.totalOutstanding}\n\n`;

    csvContent += 'TOP SERVICES BY REVENUE\n';
    csvContent += 'Service Name,Count,Revenue (INR)\n';
    reportData.topServices?.forEach((s: any) => {
      csvContent += `"${s.name}",${s.count},${s.revenue}\n`;
    });

    csvContent += '\nSTAFF PERFORMANCE & COMMISSIONS\n';
    csvContent += 'Staff Name,Role,Completed Appts,Generated Revenue,Commission Earned\n';
    reportData.staffPerformance?.forEach((st: any) => {
      csvContent += `"${st.name}","${st.role}",${st.completedAppointments},${st.revenue},${st.commissionEarned}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Salon_Report_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report CSV exported');
  };

  const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-stone-500 font-medium">
          Compiling business reports & profit analytics...
        </p>
      </div>
    );
  }

  const summary = reportData?.summary || {
    totalSales: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalExpenses: 0,
    netProfit: 0,
    invoiceCount: 0,
    newCustomersCount: 0,
  };

  const topServices = reportData?.topServices || [];
  const staffPerformance = reportData?.staffPerformance || [];
  const paymentMethodStats = reportData?.paymentMethodStats || [];
  const expenseBreakdown = reportData?.expenseBreakdown || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Financial & Business Analytics
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Revenue breakdowns, staff commissions, net profits and sales performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200/60 text-xs font-medium">
            {(['daily', 'weekly', 'monthly', 'annual'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  period === p
                    ? 'bg-white text-stone-900 shadow-sm font-semibold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Profit/Loss Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Collected Revenue
          </span>
          <h3 className="text-2xl font-bold text-stone-900 font-mono mt-2">
            {formatCurrency(summary.totalCollected)}
          </h3>
          <p className="text-xs text-stone-400 mt-2">
            From {summary.invoiceCount} invoices issued
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Recorded Expenses
          </span>
          <h3 className="text-2xl font-bold text-rose-600 font-mono mt-2">
            {formatCurrency(summary.totalExpenses)}
          </h3>
          <p className="text-xs text-stone-400 mt-2">
            Rent, supplies, utilities & maintenance
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Net Business Profit
          </span>
          <h3
            className={`text-2xl font-bold font-mono mt-2 ${
              summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(summary.netProfit)}
          </h3>
          <p className="text-xs text-stone-400 mt-2">
            Calculated: Revenue - Operational Costs
          </p>
        </div>

        {/* Outstanding Customer Balance */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Outstanding Payments
          </span>
          <h3 className="text-2xl font-bold text-amber-600 font-mono mt-2">
            {formatCurrency(summary.totalOutstanding)}
          </h3>
          <p className="text-xs text-stone-400 mt-2">
            Pending client balances to collect
          </p>
        </div>
      </div>

      {/* Visual Analytics Row: Top Services & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services Bar Chart */}
        <Card
          title="Top Performing Services"
          subtitle="Highest revenue generating styling & nail services"
        >
          <div className="h-64 w-full pt-4">
            {topServices.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                No service transactions for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topServices}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#78716c' }}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#1c1917' }}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-xl text-xs">
                            <p className="font-semibold text-stone-900">{d.name}</p>
                            <p className="text-[#7C3AED] font-bold mt-0.5">
                              Revenue: {formatCurrency(d.revenue)}
                            </p>
                            <p className="text-stone-500">Sessions: {d.count}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" fill="#7C3AED" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Payment Methods Breakdown Pie Chart */}
        <Card
          title="Payment Method Breakdown"
          subtitle="Distribution of collections via UPI, Cash and Cards"
        >
          <div className="h-64 w-full flex items-center justify-center">
            {paymentMethodStats.every((p: any) => p.amount === 0) ? (
              <div className="text-xs text-stone-400">No payment receipts logged</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodStats.filter((p: any) => p.amount > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="amount"
                    nameKey="method"
                  >
                    {paymentMethodStats.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Staff Commission & Performance Table */}
      <Card
        title="Staff & Stylist Performance Roster"
        subtitle="Individual revenue generation and commission earnings calculation"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-50/70 text-stone-600 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3">Stylist Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Completed Sessions</th>
                <th className="px-5 py-3">Generated Revenue</th>
                <th className="px-5 py-3">Commission Rate</th>
                <th className="px-5 py-3 text-right">Commission Earned (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {staffPerformance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    No completed sessions recorded for this period
                  </td>
                </tr>
              ) : (
                staffPerformance.map((st: any) => (
                  <tr
                    key={st.id}
                    className="hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-semibold text-stone-900">
                      {st.name}
                    </td>
                    <td className="px-5 py-3.5 text-purple-700 font-medium">
                      {st.role}
                    </td>
                    <td className="px-5 py-3.5 text-stone-700">
                      {st.completedAppointments} appointments
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-stone-900">
                      {formatCurrency(st.revenue)}
                    </td>
                    <td className="px-5 py-3.5 text-stone-500">
                      {st.commissionRate}%
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-emerald-700 text-right">
                      {formatCurrency(st.commissionEarned)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
