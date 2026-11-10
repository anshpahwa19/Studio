import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  format,
} from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'monthly'; // 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom'
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'daily') {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (period === 'weekly') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else if (period === 'monthly') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (period === 'annual') {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    } else if (customStart && customEnd) {
      startDate = startOfDay(parseISO(customStart));
      endDate = endOfDay(parseISO(customEnd));
    } else {
      startDate = subDays(now, 30);
      endDate = endOfDay(now);
    }

    // 1. Invoices & Payments in period
    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { not: 'Cancelled' },
      },
      include: {
        customer: true,
        items: {
          include: {
            service: true,
            product: true,
          },
        },
        payments: true,
      },
    });

    const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

    // 2. Expenses in period
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: { gte: startDate, lte: endDate },
      },
      include: {
        category: true,
      },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalCollected - totalExpenses;

    // 3. Service Breakdown
    const serviceRevenueMap = new Map<string, { name: string; count: number; revenue: number }>();
    const productRevenueMap = new Map<string, { name: string; count: number; revenue: number }>();

    for (const inv of invoices) {
      for (const item of inv.items) {
        if (item.type === 'service') {
          const key = item.name;
          const curr = serviceRevenueMap.get(key) || { name: key, count: 0, revenue: 0 };
          curr.count += item.quantity;
          curr.revenue += item.totalPrice;
          serviceRevenueMap.set(key, curr);
        } else if (item.type === 'product') {
          const key = item.name;
          const curr = productRevenueMap.get(key) || { name: key, count: 0, revenue: 0 };
          curr.count += item.quantity;
          curr.revenue += item.totalPrice;
          productRevenueMap.set(key, curr);
        }
      }
    }

    const topServices = Array.from(serviceRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topProducts = Array.from(productRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 4. Payment method breakdown
    const paymentMethodsMap: Record<string, number> = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      Other: 0,
    };

    for (const inv of invoices) {
      for (const p of inv.payments) {
        const m = p.method || 'Other';
        paymentMethodsMap[m] = (paymentMethodsMap[m] || 0) + p.amount;
      }
    }

    const paymentMethodStats = Object.entries(paymentMethodsMap).map(([method, amount]) => ({
      method,
      amount,
    }));

    // 5. Staff Performance
    const staffMembers = await prisma.staff.findMany({
      where: { isActive: true },
      include: {
        appointments: {
          where: {
            date: { gte: startDate, lte: endDate },
            status: 'Completed',
          },
          include: {
            services: true,
          },
        },
      },
    });

    const staffPerformance = staffMembers.map((s) => {
      let revenue = 0;
      for (const appt of s.appointments) {
        for (const svc of appt.services) {
          revenue += svc.price;
        }
      }
      const commission = (revenue * s.commissionRate) / 100;
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        completedAppointments: s.appointments.length,
        revenue,
        commissionRate: s.commissionRate,
        commissionEarned: commission,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // 6. Expense Breakdown by Category
    const expenseCategoryMap: Record<string, number> = {};
    for (const e of expenses) {
      const cName = e.category?.name || 'Uncategorized';
      expenseCategoryMap[cName] = (expenseCategoryMap[cName] || 0) + e.amount;
    }
    const expenseBreakdown = Object.entries(expenseCategoryMap).map(([category, amount]) => ({
      category,
      amount,
    }));

    // 7. Customers Stats
    const totalCustomersInPeriod = await prisma.customer.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        summary: {
          totalSales,
          totalCollected,
          totalOutstanding,
          totalExpenses,
          netProfit,
          invoiceCount: invoices.length,
          newCustomersCount: totalCustomersInPeriod,
        },
        topServices,
        topProducts,
        paymentMethodStats,
        staffPerformance,
        expenseBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
