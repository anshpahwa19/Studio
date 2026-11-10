import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { serviceSchema } from '@/lib/validations';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const service = await prisma.service.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        taxSetting: true,
      },
    });

    if (!service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch service' },
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
    const validation = serviceSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }

    const service = await prisma.service.update({
      where: { id: params.id },
      data: validation.data,
      include: {
        category: true,
        taxSetting: true,
      },
    });

    return NextResponse.json({ success: true, data: service });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update service' },
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

    await prisma.service.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Service archived' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete service' },
      { status: 500 }
    );
  }
}
