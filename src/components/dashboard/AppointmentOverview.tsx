'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface AppointmentOverviewProps {
  stats: {
    confirmedToday: number;
    inProgressToday: number;
    completedToday: number;
    cancelledToday: number;
  };
}

export const AppointmentOverview: React.FC<AppointmentOverviewProps> = ({ stats }) => {
  const chartData = [
    { name: 'Confirmed', count: stats.confirmedToday, color: '#6366F1' },
    { name: 'In Progress', count: stats.inProgressToday, color: '#F59E0B' },
    { name: 'Completed', count: stats.completedToday, color: '#10B981' },
    { name: 'Cancelled', count: stats.cancelledToday, color: '#F43F5E' },
  ];

  return (
    <Card
      title="Appointment Status (Today)"
      subtitle="Current lifecycle distribution"
      className="h-full flex flex-col justify-between"
    >
      <div className="h-72 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#78716c' }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#78716c' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-xl text-xs">
                      <p className="font-semibold text-stone-900">{data.name}</p>
                      <p className="text-stone-600 mt-0.5 font-bold">
                        Count: {data.count}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
