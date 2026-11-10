import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { expenseSchema } from '@/lib/validations';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }
    if (startDate && endDate) {
      where.expenseDate = {
        gte: startOfDay(parseISO(startDate)),
        lte: endOfDay(parseISO(endDate)),
      };
    }
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { vendor: { contains: search } },
      ];
    }

    const [total, expenses, categories] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          category: true,
        },
      }),
      prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return NextResponse.json({
      success: true,
      data: expenses,
      categories,
      totalAmount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = expenseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }

    const data = validation.data;
    const expense = await prisma.expense.create({
      data: {
        categoryId: data.categoryId,
        amount: data.amount,
        description: data.description || null,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        paymentMethod: data.paymentMethod || 'Cash',
        vendor: data.vendor || null,
        notes: data.notes || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record expense' },
      { status: 500 }
    );
  }
}
