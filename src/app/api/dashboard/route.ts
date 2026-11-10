import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // 1. Today's appointments count
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        customer: true,
        staff: true,
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    const completedToday = todayAppointments.filter((a) => a.status === 'Completed').length;
    const confirmedToday = todayAppointments.filter((a) => a.status === 'Confirmed').length;
    const inProgressToday = todayAppointments.filter((a) => a.status === 'InProgress').length;
    const cancelledToday = todayAppointments.filter((a) => a.status === 'Cancelled').length;

    // 2. Customers stats
    const totalCustomers = await prisma.customer.count({ where: { isActive: true } });
    const thirtyDaysAgo = subDays(today, 30);
    const newCustomers = await prisma.customer.count({
      where: {
        isActive: true,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // 3. Revenue stats
    const allInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['Paid', 'PartiallyPaid'] },
      },
      include: {
        payments: true,
      },
    });

    const totalRevenue = allInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);

    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['Unpaid', 'PartiallyPaid'] },
      },
    });
    const pendingPayments = pendingInvoices.reduce((acc, inv) => acc + inv.balanceAmount, 0);

    // 4. Revenue over last 7 days for chart
    const last7DaysData: { date: string; revenue: number; appointments: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const dStart = startOfDay(d);
      const dEnd = endOfDay(d);

      const dayPayments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: dStart,
            lte: dEnd,
          },
        },
      });

      const dayAppts = await prisma.appointment.count({
        where: {
          date: {
            gte: dStart,
            lte: dEnd,
          },
        },
      });

      const dayRev = dayPayments.reduce((sum, p) => sum + p.amount, 0);

      last7DaysData.push({
        date: format(d, 'dd MMM'),
        revenue: dayRev,
        appointments: dayAppts,
      });
    }

    // 5. Recent transactions (last 8 payments)
    const recentPayments = await prisma.payment.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
      },
    });

    // 6. Upcoming appointments (next 5)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['Confirmed', 'CheckedIn'] },
        date: { gte: todayStart },
      },
      take: 5,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        customer: true,
        staff: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          todayAppointmentsCount: todayAppointments.length,
          completedToday,
          confirmedToday,
          inProgressToday,
          cancelledToday,
          totalRevenue,
          totalCustomers,
          newCustomers,
          pendingPayments,
        },
        revenueChart: last7DaysData,
        todayAppointments,
        recentTransactions: recentPayments,
        upcomingAppointments,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
