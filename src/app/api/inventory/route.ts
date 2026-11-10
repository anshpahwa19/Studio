import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { productSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const lowStockOnly = searchParams.get('lowStock') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    const [total, products, categories, suppliers] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: true,
          supplier: true,
        },
      }),
      prisma.productCategory.findMany({ orderBy: { name: 'asc' } }),
      prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    ]);

    // Filter low stock if requested
    const filteredProducts = lowStockOnly
      ? products.filter((p) => p.stock <= p.minStockLevel)
      : products;

    return NextResponse.json({
      success: true,
      data: filteredProducts,
      categories,
      suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch inventory' },
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
    const validation = productSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check SKU if provided
    if (data.sku) {
      const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          description: data.description || null,
          categoryId: data.categoryId,
          sku: data.sku || null,
          barcode: data.barcode || null,
          purchasePrice: data.purchasePrice || 0,
          sellingPrice: data.sellingPrice,
          stock: data.stock || 0,
          minStockLevel: data.minStockLevel || 5,
          unit: data.unit || 'pcs',
          supplierId: data.supplierId || null,
        },
        include: {
          category: true,
          supplier: true,
        },
      });

      // Initial inventory log if initial stock > 0
      if (data.stock && data.stock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            productId: created.id,
            type: 'IN',
            quantity: data.stock,
            previousStock: 0,
            newStock: data.stock,
            reason: 'Initial Opening Stock',
          },
        });
      }

      return created;
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
