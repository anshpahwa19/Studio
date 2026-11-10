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
    const { amount, method, reference, notes, isAdvance } = body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid payment amount is required' },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId: params.id,
          amount: paymentAmount,
          method: method || 'Cash',
          reference: reference || null,
          notes: notes || null,
          isAdvance: Boolean(isAdvance),
        },
      });

      const newPaidAmount = invoice.paidAmount + paymentAmount;
      const newBalanceAmount = Math.max(0, invoice.totalAmount - newPaidAmount);

      let newStatus = invoice.status;
      if (newBalanceAmount <= 0) {
        newStatus = 'Paid';
      } else {
        newStatus = 'PartiallyPaid';
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: params.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
        },
        include: {
          customer: true,
          items: true,
          payments: true,
        },
      });

      // Update customer totalSpent
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: {
          totalSpent: { increment: paymentAmount },
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
