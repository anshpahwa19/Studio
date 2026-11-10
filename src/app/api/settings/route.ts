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

    let settings = await prisma.salonSettings.findFirst({
      include: {
        taxSettings: {
          orderBy: { rate: 'desc' },
        },
      },
    });

    if (!settings) {
      settings = await prisma.salonSettings.create({
        data: {
          name: 'Shruti Pahwa Luxury Salon and academy',
          currency: 'INR',
          currencySymbol: '₹',
        },
        include: {
          taxSettings: true,
        },
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    let settings = await prisma.salonSettings.findFirst();
    if (!settings) {
      settings = await prisma.salonSettings.create({ data: { name: 'Shruti Pahwa Luxury Salon and academy' } });
    }

    const updated = await prisma.salonSettings.update({
      where: { id: settings.id },
      data: {
        name: body.name ?? settings.name,
        address: body.address ?? settings.address,
        city: body.city ?? settings.city,
        state: body.state ?? settings.state,
        zipCode: body.zipCode ?? settings.zipCode,
        country: body.country ?? settings.country,
        phone: body.phone ?? settings.phone,
        email: body.email ?? settings.email,
        website: body.website ?? settings.website,
        gstin: body.gstin ?? settings.gstin,
        panNumber: body.panNumber ?? settings.panNumber,
        currency: body.currency ?? settings.currency,
        currencySymbol: body.currencySymbol ?? settings.currencySymbol,
        openTime: body.openTime ?? settings.openTime,
        closeTime: body.closeTime ?? settings.closeTime,
        slotDuration: body.slotDuration ? Number(body.slotDuration) : settings.slotDuration,
        invoicePrefix: body.invoicePrefix ?? settings.invoicePrefix,
        invoiceNextNum: body.invoiceNextNum ? Number(body.invoiceNextNum) : settings.invoiceNextNum,
      },
      include: {
        taxSettings: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
