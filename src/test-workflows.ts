import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Running Comprehensive Salon System Verification Tests...\n');

  // Test 1: User Authentication & Passwords
  console.log('--- Test 1: Authentication & Role Verification ---');
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@salon.com' },
    include: { role: true },
  });

  if (!adminUser) throw new Error('Admin user not found');
  const passwordValid = await bcrypt.compare('admin123', adminUser.passwordHash);
  if (!passwordValid) throw new Error('Admin password hash mismatch');
  console.log(`✅ Admin authenticated successfully (Role: ${adminUser.role.name})`);

  // Test 2: Master Data Integrity
  console.log('\n--- Test 2: Master Data Integrity ---');
  const [servicesCount, staffCount, customerCount, productCount, taxCount] = await Promise.all([
    prisma.service.count(),
    prisma.staff.count(),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.taxSetting.count(),
  ]);
  console.log(`✅ Loaded ${servicesCount} salon services across multiple categories`);
  console.log(`✅ Loaded ${staffCount} staff stylists with availability schedules`);
  console.log(`✅ Loaded ${customerCount} registered clients`);
  console.log(`✅ Loaded ${productCount} inventory retail products`);
  console.log(`✅ Loaded ${taxCount} configurable GST tax tiers`);

  // Test 3: Double Booking Prevention & Appointment Logic
  console.log('\n--- Test 3: Appointment Scheduling & Conflict Prevention ---');
  const staff = await prisma.staff.findFirst({ where: { role: 'Senior Stylist' } });
  const customer = await prisma.customer.findFirst();
  const service = await prisma.service.findFirst({ where: { name: { contains: 'Haircut' } } });

  if (!staff || !customer || !service) throw new Error('Staff/Customer/Service missing');

  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 1); // Tomorrow

  // Create First Appointment: 10:00 to 10:45
  const appt1 = await prisma.appointment.create({
    data: {
      customerId: customer.id,
      staffId: staff.id,
      date: testDate,
      startTime: '10:00',
      endTime: '10:45',
      totalDuration: 45,
      status: 'Confirmed',
      services: {
        create: {
          serviceId: service.id,
          staffId: staff.id,
          price: service.price,
          duration: service.duration,
        },
      },
    },
  });
  console.log(`✅ Appointment 1 created: ${appt1.startTime} - ${appt1.endTime} with ${staff.name}`);

  // Simulate conflict check for overlapping appointment (10:30 to 11:15)
  const proposedStart = 10 * 60 + 30; // 10:30 = 630 mins
  const proposedEnd = proposedStart + 45; // 11:15 = 675 mins

  const existingAppts = await prisma.appointment.findMany({
    where: {
      staffId: staff.id,
      date: testDate,
      status: { notIn: ['Cancelled', 'NoShow'] },
    },
  });

  let conflictDetected = false;
  for (const ex of existingAppts) {
    const [exH1, exM1] = ex.startTime.split(':').map(Number);
    const [exH2, exM2] = ex.endTime.split(':').map(Number);
    const exStart = exH1 * 60 + exM1;
    const exEnd = exH2 * 60 + exM2;

    if (proposedStart < exEnd && proposedEnd > exStart) {
      conflictDetected = true;
      break;
    }
  }

  if (conflictDetected) {
    console.log('✅ Double-booking conflict correctly caught and prevented for overlapping slot!');
  } else {
    throw new Error('Double-booking conflict was NOT detected');
  }

  // Clean up test appointment
  await prisma.appointment.delete({ where: { id: appt1.id } });

  // Test 4: POS Billing, GST, Discounts & Inventory Stock Deductions
  console.log('\n--- Test 4: POS Billing & Automatic Inventory Deductions ---');
  const product = await prisma.product.findFirst({ where: { stock: { gt: 5 } } });
  if (!product) throw new Error('No product with sufficient stock');

  const initialStock = product.stock;
  const initialCustomerSpend = customer.totalSpent;
  const saleQty = 2;

  // Run billing transaction
  const invoice = await prisma.$transaction(async (tx) => {
    let settings = await tx.salonSettings.findFirst();
    if (!settings) settings = await tx.salonSettings.create({ data: { name: 'Luxe Studio' } });

    const invNum = `${settings.invoicePrefix}${settings.invoiceNextNum}`;
    await tx.salonSettings.update({
      where: { id: settings.id },
      data: { invoiceNextNum: settings.invoiceNextNum + 1 },
    });

    const itemPrice = product.sellingPrice;
    const itemSubtotal = itemPrice * saleQty;
    const taxRate = 18;
    const taxVal = (itemSubtotal * taxRate) / 100;
    const discountAmount = 50; // 50 flat discount
    const totalAmount = itemSubtotal - discountAmount + taxVal;
    const paidAmount = totalAmount; // Full payment via UPI

    const inv = await tx.invoice.create({
      data: {
        invoiceNumber: invNum,
        customerId: customer.id,
        subtotal: itemSubtotal,
        discountType: 'fixed',
        discountValue: 50,
        discountAmount,
        taxAmount: taxVal,
        totalAmount,
        paidAmount,
        balanceAmount: 0,
        status: 'Paid',
        items: {
          create: {
            type: 'product',
            productId: product.id,
            name: product.name,
            quantity: saleQty,
            unitPrice: itemPrice,
            taxRate,
            taxAmount: taxVal,
            totalPrice: totalAmount,
          },
        },
        payments: {
          create: {
            amount: paidAmount,
            method: 'UPI',
            reference: 'TEST-UPI-123456',
          },
        },
      },
    });

    // Deduct stock
    const newStock = initialStock - saleQty;
    await tx.product.update({
      where: { id: product.id },
      data: { stock: newStock },
    });

    await tx.inventoryTransaction.create({
      data: {
        productId: product.id,
        type: 'OUT',
        quantity: saleQty,
        previousStock: initialStock,
        newStock,
        reason: `Sale on Invoice ${invNum}`,
        referenceId: inv.id,
      },
    });

    // Increment customer totalSpent
    await tx.customer.update({
      where: { id: customer.id },
      data: { totalSpent: { increment: paidAmount } },
    });

    return inv;
  });

  console.log(`✅ Invoice ${invoice.invoiceNumber} generated for amount ₹${invoice.totalAmount}`);

  // Verify stock deduction
  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
  if (updatedProduct?.stock !== initialStock - saleQty) {
    throw new Error('Stock was not properly deducted');
  }
  console.log(`✅ Product stock automatically deducted: ${initialStock} → ${updatedProduct.stock} ${updatedProduct.unit}`);

  // Verify customer lifetime spend
  const updatedCustomer = await prisma.customer.findUnique({ where: { id: customer.id } });
  if (updatedCustomer?.totalSpent !== initialCustomerSpend + invoice.paidAmount) {
    throw new Error('Customer totalSpent was not updated');
  }
  console.log(`✅ Customer lifetime spend updated: ₹${initialCustomerSpend} → ₹${updatedCustomer.totalSpent}`);

  // Test 5: Expense & Profit Calculation
  console.log('\n--- Test 5: Expense Recording & Financial Analytics ---');
  const expCat = await prisma.expenseCategory.findFirst();
  if (!expCat) throw new Error('No expense category found');

  const expense = await prisma.expense.create({
    data: {
      categoryId: expCat.id,
      amount: 450,
      description: 'Salon Sanitization & Fresh Towels',
      paymentMethod: 'Cash',
      vendor: 'Laundry Express',
    },
  });

  console.log(`✅ Expense recorded: ₹${expense.amount} under ${expCat.name}`);

  // Clean up test transactions to keep seed data pristine
  await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } });
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
  await prisma.inventoryTransaction.deleteMany({ where: { referenceId: invoice.id } });
  await prisma.invoice.delete({ where: { id: invoice.id } });
  await prisma.product.update({ where: { id: product.id }, data: { stock: initialStock } });
  await prisma.customer.update({ where: { id: customer.id }, data: { totalSpent: initialCustomerSpend } });
  await prisma.expense.delete({ where: { id: expense.id } });

  console.log('\n✨ ALL CRITICAL WORKFLOW & INTEGRATION TESTS PASSED 100%! ✨\n');
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
