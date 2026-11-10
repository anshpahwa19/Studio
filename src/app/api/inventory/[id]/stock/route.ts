import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, quantity, reason } = body; // type: 'IN' | 'OUT' | 'ADJUSTMENT'

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid positive quantity is required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    let newStock = product.stock;
    if (type === 'IN') {
      newStock += qty;
    } else if (type === 'OUT') {
      if (product.stock < qty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock. Current available stock is ${product.stock} ${product.unit}`,
          },
          { status: 400 }
        );
      }
      newStock -= qty;
    } else if (type === 'ADJUSTMENT') {
      newStock = qty; // Direct adjustment to new level
    } else {
      return NextResponse.json({ success: false, error: 'Invalid stock adjustment type' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: params.id },
        data: { stock: newStock },
        include: {
          category: true,
          supplier: true,
        },
      });

      const log = await tx.inventoryTransaction.create({
        data: {
          productId: params.id,
          type,
          quantity: type === 'ADJUSTMENT' ? Math.abs(newStock - product.stock) : qty,
          previousStock: product.stock,
          newStock,
          reason: reason || `Manual stock ${type.toLowerCase()}`,
        },
      });

      return { product: updated, transaction: log };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}
