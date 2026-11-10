import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [invoice, salonSettings] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: params.id },
        include: {
          customer: true,
          items: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          appointment: {
            include: {
              staff: true,
            },
          },
        },
      }),
      prisma.salonSettings.findFirst(),
    ]);

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        salonSettings,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invoice' },
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
    const { status, notes } = body;

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update invoice' },
      { status: 500 }
    );
  }
}
