import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const taxes = await prisma.taxSetting.findMany({
      orderBy: { rate: 'desc' },
    });

    return NextResponse.json({ success: true, data: taxes });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tax settings' },
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
    const { name, rate, isDefault } = body;

    if (!name || rate === undefined) {
      return NextResponse.json({ success: false, error: 'Name and rate are required' }, { status: 400 });
    }

    const settings = await prisma.salonSettings.findFirst();
    if (!settings) {
      return NextResponse.json({ success: false, error: 'Salon settings not configured' }, { status: 400 });
    }

    if (isDefault) {
      await prisma.taxSetting.updateMany({
        where: { salonSettingsId: settings.id },
        data: { isDefault: false },
      });
    }

    const tax = await prisma.taxSetting.create({
      data: {
        name,
        rate: Number(rate),
        isDefault: Boolean(isDefault),
        salonSettingsId: settings.id,
      },
    });

    return NextResponse.json({ success: true, data: tax }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create tax setting' },
      { status: 500 }
    );
  }
}
