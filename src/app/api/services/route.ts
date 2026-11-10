import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { serviceSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    const where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        taxSetting: true,
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: services });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch services' },
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
    const validation = serviceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }

    const data = validation.data;
    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description || null,
        categoryId: data.categoryId,
        price: data.price,
        duration: data.duration,
        taxSettingId: data.taxSettingId || null,
        isActive: data.isActive ?? true,
      },
      include: {
        category: true,
        taxSetting: true,
      },
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}
