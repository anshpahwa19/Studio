import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { staffSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { role: { contains: search } },
      ];
    }

    const staffMembers = await prisma.staff.findMany({
      where,
      include: {
        availability: true,
        leaves: {
          where: {
            endDate: { gte: new Date() },
          },
        },
        _count: {
          select: {
            appointments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: staffMembers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch staff' },
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
    const validation = staffSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check phone
    const existing = await prisma.staff.findUnique({ where: { phone: data.phone } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Staff member with this phone number already exists' },
        { status: 409 }
      );
    }

    const staff = await prisma.$transaction(async (tx) => {
      const created = await tx.staff.create({
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          gender: data.gender || null,
          role: data.role,
          commissionRate: data.commissionRate || 0,
          specializations: data.specializations ? JSON.stringify(data.specializations) : null,
        },
      });

      // Default Mon-Sat 09:00 - 19:00 availability
      for (let day = 1; day <= 6; day++) {
        await tx.staffAvailability.create({
          data: {
            staffId: created.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '19:00',
            isOff: false,
          },
        });
      }
      // Sunday off
      await tx.staffAvailability.create({
        data: {
          staffId: created.id,
          dayOfWeek: 0,
          startTime: '09:00',
          endTime: '19:00',
          isOff: true,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: staff }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create staff' },
      { status: 500 }
    );
  }
}
