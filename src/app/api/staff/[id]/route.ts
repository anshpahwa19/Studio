import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { staffSchema } from '@/lib/validations';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: params.id },
      include: {
        availability: {
          orderBy: { dayOfWeek: 'asc' },
        },
        leaves: {
          orderBy: { startDate: 'desc' },
        },
        appointments: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            customer: true,
            services: { include: { service: true } },
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: staff });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch staff' },
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
    const validation = staffSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }

    const data: any = { ...validation.data };
    if (data.specializations && Array.isArray(data.specializations)) {
      data.specializations = JSON.stringify(data.specializations);
    }

    const staff = await prisma.staff.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update staff' },
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

    await prisma.staff.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Staff archived' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete staff' },
      { status: 500 }
    );
  }
}
