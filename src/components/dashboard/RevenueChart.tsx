'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface RevenueChartProps {
  data: { date: string; revenue: number; appointments: number }[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  return (
    <Card
      title="Revenue Overview (7 Days)"
      subtitle="Daily collected revenue from POS checkout & payments"
      action={
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Live Trends</span>
        </div>
      }
      className="h-full flex flex-col justify-between"
    >
      <div className="h-72 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f5f5f4"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#78716c' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#78716c' }}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-xl text-xs">
                      <p className="font-semibold text-stone-900 mb-1">{label}</p>
                      <p className="text-[#7C3AED] font-bold">
                        Revenue: {formatCurrency(Number(payload[0].value))}
                      </p>
                      {payload[1] && (
                        <p className="text-stone-500 mt-0.5">
                          Appointments: {payload[1].value}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#7C3AED"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#revenueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
