'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowUpRight, Clock, User, Scissors } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface UpcomingAppointmentsProps {
  appointments: any[];
}

export const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({
  appointments,
}) => {
  return (
    <Card
      title="Upcoming Appointments"
      subtitle="Scheduled customer sessions"
      action={
        <Link
          href="/appointments"
          className="text-xs font-semibold text-[#7C3AED] hover:underline flex items-center gap-0.5"
        >
          <span>Open Calendar</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      }
      noPadding
    >
      <div className="divide-y divide-stone-100 max-h-[380px] overflow-y-auto">
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400">
            No upcoming appointments scheduled
          </div>
        ) : (
          appointments.map((appt) => {
            const serviceNames = appt.services
              ?.map((s: any) => s.service?.name)
              .join(', ') || 'Salon Service';

            return (
              <div
                key={appt.id}
                className="p-4 hover:bg-stone-50/60 transition-colors flex items-center justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-stone-400">
                      {formatDate(appt.date).slice(0, 3)}
                    </span>
                    <span className="text-xs font-bold text-[#7C3AED]">
                      {appt.startTime}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 leading-tight">
                      {appt.customer?.name}
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5 truncate max-w-xs flex items-center gap-1">
                      <Scissors className="w-3 h-3 text-stone-400" />
                      <span>{serviceNames}</span>
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3 text-stone-400" />
                      <span>Staff: {appt.staff?.name}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      appt.status === 'Confirmed'
                        ? 'primary'
                        : appt.status === 'CheckedIn'
                        ? 'warning'
                        : 'success'
                    }
                    size="sm"
                  >
                    {appt.status}
                  </Badge>
                  <span className="text-[11px] text-stone-400 block mt-1">
                    {appt.totalDuration} mins
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
