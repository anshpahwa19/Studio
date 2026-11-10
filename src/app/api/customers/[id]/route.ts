import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { customerSchema } from '@/lib/validations';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        preferredStaff: true,
        appointments: {
          orderBy: { date: 'desc' },
          include: {
            staff: true,
            services: {
              include: { service: true },
            },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = customerSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: validation.data,
    });

    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete
    await prisma.customer.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Customer archived' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
