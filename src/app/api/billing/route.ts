import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateInvoiceNumber } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const branchId = searchParams.get('branchId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (branchId && branchId !== 'all') {
      where.branchId = branchId;
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          items: true,
          payments: true,
          appointment: {
            include: {
              staff: true,
            },
          },
          branch: true,

        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invoices' },
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
    const {
      customerId,
      appointmentId,
      items, // array of { type: 'service' | 'product', serviceId?, productId?, name, quantity, unitPrice, taxRate }
      discountType, // 'percentage' | 'fixed' | null
      discountValue, // number
      payments, // array of { amount, method: 'Cash'|'UPI'|'Card'|'Other', reference? }
      notes,
      branchId,
    } = body;


    if (!customerId || !items || !items.length) {
      return NextResponse.json(
        { success: false, error: 'Customer and at least one line item are required' },
        { status: 400 }
      );
    }

    // Run within a database transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Get or create Salon Settings for invoice numbering
      let settings = await tx.salonSettings.findFirst();
      if (!settings) {
        settings = await tx.salonSettings.create({
          data: { name: 'Shruti Pahwa Luxury Salon and academy' },
        });
      }

      const invNumber = generateInvoiceNumber(settings.invoicePrefix, settings.invoiceNextNum);

      // Increment next invoice number
      await tx.salonSettings.update({
        where: { id: settings.id },
        data: { invoiceNextNum: settings.invoiceNextNum + 1 },
      });

      // 2. Calculate subtotal & tax per item
      let subtotal = 0;
      let totalTax = 0;

      const processedItems = items.map((item: any) => {
        const qty = item.quantity || 1;
        const lineTotal = item.unitPrice * qty;
        const rate = item.taxRate || 0;
        const taxVal = (lineTotal * rate) / 100;

        subtotal += lineTotal;
        totalTax += taxVal;

        return {
          type: item.type,
          serviceId: item.serviceId || null,
          productId: item.productId || null,
          name: item.name,
          quantity: qty,
          unitPrice: item.unitPrice,
          taxRate: rate,
          taxAmount: taxVal,
          totalPrice: lineTotal + taxVal,
        };
      });

      // 3. Calculate discount
      let discountAmount = 0;
      const dVal = discountValue || 0;
      if (discountType === 'percentage' && dVal > 0) {
        discountAmount = (subtotal * dVal) / 100;
      } else if (discountType === 'fixed' && dVal > 0) {
        discountAmount = Math.min(dVal, subtotal);
      }

      const totalAmount = Math.max(0, subtotal - discountAmount + totalTax);

      // 4. Calculate initial payments
      let paidAmount = 0;
      const initialPayments = payments || [];
      for (const p of initialPayments) {
        paidAmount += Number(p.amount) || 0;
      }

      const balanceAmount = Math.max(0, totalAmount - paidAmount);
      let status = 'Unpaid';
      if (paidAmount >= totalAmount && totalAmount > 0) {
        status = 'Paid';
      } else if (paidAmount > 0) {
        status = 'PartiallyPaid';
      }

      // 5. Create invoice record
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: invNumber,
          customerId,
          appointmentId: appointmentId || null,
          subtotal,
          discountType: discountType || null,
          discountValue: dVal,
          discountAmount,
          taxAmount: totalTax,
          totalAmount,
          paidAmount,
          balanceAmount,
          status,
          notes: notes || null,
          branchId: branchId || null,
          items: {
            create: processedItems,
          },
        },
      });

      // 6. Record payments & update customer totalSpent
      for (const p of initialPayments) {
        if (p.amount > 0) {
          await tx.payment.create({
            data: {
              invoiceId: createdInvoice.id,
              amount: Number(p.amount),
              method: p.method || 'Cash',
              reference: p.reference || null,
              notes: p.notes || null,
            },
          });
        }
      }

      if (paidAmount > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalSpent: { increment: paidAmount },
          },
        });
      }

      // 7. Inventory Stock Deductions for Product items
      for (const item of processedItems) {
        if (item.type === 'product' && item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            const newStock = Math.max(0, product.stock - item.quantity);
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: newStock },
            });

            await tx.inventoryTransaction.create({
              data: {
                productId: item.productId,
                type: 'OUT',
                quantity: item.quantity,
                previousStock: product.stock,
                newStock,
                reason: `Sale on Invoice ${invNumber}`,
                referenceId: createdInvoice.id,
              },
            });
          }
        }
      }

      // 8. If linked to an appointment, mark appointment as Completed
      if (appointmentId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: 'Completed' },
        });
      }

      return createdInvoice;
    });

    const fullInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    return NextResponse.json({ success: true, data: fullInvoice }, { status: 201 });
  } catch (error: any) {
    console.error('Create Invoice Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
