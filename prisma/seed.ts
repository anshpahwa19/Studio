// Fills the database. `tsx prisma/seed.ts` loads demo data; add `--empty` for a clean start
// with only the owner login, business settings and service categories.
// It refuses to touch a database that already has logins unless `--reset` is given.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { computeBill, invoiceStatus } from '../src/lib/billing';
import { addDays, fromMinutes, isoDate, toMinutes } from '../src/lib/format';

const db = new PrismaClient();
const EMPTY = process.argv.includes('--empty');
const RESET = process.argv.includes('--reset');
const today = isoDate();
const GST = 5;

async function wipe() {
  await db.refund.deleteMany();
  await db.payment.deleteMany();
  await db.invoiceItem.deleteMany();
  await db.invoice.deleteMany();
  await db.stockMovement.deleteMany();
  await db.appointmentService.deleteMany();
  await db.appointment.deleteMany();
  await db.expense.deleteMany();
  await db.product.deleteMany();
  await db.supplierPayment.deleteMany();
  await db.supplierBill.deleteMany();
  await db.supplier.deleteMany();
  await db.service.deleteMany();
  await db.serviceCategory.deleteMany();
  await db.customer.deleteMany();
  await db.attendance.deleteMany();
  await db.staff.deleteMany();
  await db.branch.deleteMany();
  await db.user.deleteMany();
  await db.settings.deleteMany();
}

async function main() {
  if (!RESET && (await db.user.count()) > 0) {
    console.log('The database already has data, so nothing was changed. Use `npm run setup:demo` or `npm run setup:fresh` to start over.');
    return;
  }
  await wipe();

  await db.settings.create({
    data: {
      id: 1,
      name: 'Shruti Pahwa Luxury Salon & Academy',
      address: 'Huda Market, Sector 46, Gurugram, Haryana',
      phone: EMPTY ? '' : '+91 124 400 0000',
      email: EMPTY ? '' : 'hello@example.com',
      gstin: '',
      invoicePrefix: 'SP',
      nextInvoiceNo: 1001,
      invoiceFooter: 'Thank you for visiting Shruti Pahwa Luxury Salon & Academy.',
    },
  });

  const hash = (p: string) => bcrypt.hash(p, 10);
  // Demo data keeps the well-known demo password. A clean install gets its own: OWNER_PASSWORD if set, otherwise a random one.
  const ownerPassword = EMPTY ? process.env.OWNER_PASSWORD || randomBytes(9).toString('base64url') : 'admin123';
  await db.user.create({ data: { name: 'Shruti Pahwa', email: 'admin@salon.com', passwordHash: await hash(ownerPassword), role: 'Owner' } });

  const categories = ['Haircut & Styling', 'Hair Colouring', 'Hair Spa & Treatments', 'Manicure', 'Pedicure', 'Nail Extensions', 'Nail Art & Gel'];
  const cat: Record<string, string> = {};
  for (const [i, name] of categories.entries()) cat[name] = (await db.serviceCategory.create({ data: { name, sortOrder: i } })).id;

  if (EMPTY) {
    console.log(`Clean database ready.\nSign in with admin@salon.com / ${ownerPassword}\nNote this password now, it is not shown again. You can change it from the account page.`);
    return;
  }

  // ── Team logins ────────────────────────────────────────────
  await db.user.createMany({
    data: [
      { name: 'Priya Sharma', email: 'manager@salon.com', passwordHash: await hash('manager123'), role: 'Manager' },
      { name: 'Anita Verma', email: 'reception@salon.com', passwordHash: await hash('reception123'), role: 'Receptionist' },
    ],
  });

  const huda = await db.branch.create({ data: { name: 'Huda Market', address: 'Sector 46, Gurugram' } });
  const spaze = await db.branch.create({ data: { name: 'Spaze Corporate Park', address: 'Sector 69, Gurugram' } });

  // ── Staff ─────────────────────────────────────────────────
  const mkStaff = (name: string, phone: string, title: string, skills: string, commissionRate: number) =>
    db.staff.create({ data: { name, phone, title, skills, commissionRate } });
  const rahul = await mkStaff('Rahul Mehra', '+91 99887 76601', 'Senior Stylist', 'Haircut, Colour, Hair Spa, Keratin', 30);
  const neha = await mkStaff('Neha Kapoor', '+91 99887 76602', 'Senior Nail Artist', 'Manicure, Pedicure, Nail Art, Extensions', 30);
  const arjun = await mkStaff('Arjun Reddy', '+91 99887 76603', 'Stylist', 'Haircut, Styling, Beard, Hair Spa', 25);
  const kavitha = await mkStaff('Kavitha Nair', '+91 99887 76604', 'Nail Technician', 'Manicure, Pedicure, Gel Polish', 25);
  const pooja = await mkStaff('Pooja Verma', '+91 99887 76605', 'Master Colourist', 'Balayage, Global Colour, Highlights', 35);

  // ── Services ──────────────────────────────────────────────
  const svc: Record<string, { id: string; name: string; price: number; duration: number }> = {};
  const services: [string, string, number, number, string][] = [
    ['Haircut & Styling', "Women's Signature Haircut", 950, 45, 'Consultation, wash, precision cut and blow-dry.'],
    ['Haircut & Styling', "Men's Executive Haircut", 600, 30, 'Fade or scissor cut with shampoo and head massage.'],
    ['Haircut & Styling', 'Blow Dry & Styling', 750, 35, 'Curls or sleek straight finish with heat protection.'],
    ['Hair Colouring', 'Balayage & Toning', 5800, 180, 'Hand-painted balayage with gloss toner.'],
    ['Hair Colouring', 'Global Ammonia-Free Colour', 3400, 120, 'Root-to-tip colour with shine treatment.'],
    ['Hair Colouring', 'Root Touch-up', 1800, 60, 'Grey coverage and root matching.'],
    ['Hair Spa & Treatments', 'Brazilian Keratin', 6500, 180, 'Smoothing treatment lasting up to 4 months.'],
    ['Hair Spa & Treatments', 'Argan Detox Hair Spa', 1600, 60, 'Scalp exfoliation, steam and hydrating mask.'],
    ['Manicure', 'Gel Polish Manicure', 1200, 45, 'Cuticle care, shaping, massage and gel polish.'],
    ['Manicure', 'Classic Manicure', 750, 35, 'Exfoliation, massage and lacquer finish.'],
    ['Pedicure', 'Spa Pedicure', 1600, 60, 'Soak, scrub, paraffin mask and massage.'],
    ['Pedicure', 'Classic Pedicure', 950, 40, 'Soak, scrub, shaping and massage.'],
    ['Nail Extensions', 'Gel Extensions (Full Set)', 3200, 90, 'Sculpted gel extensions, almond, coffin or square.'],
    ['Nail Art & Gel', 'Designer Nail Art (10 nails)', 1800, 60, 'Chrome, ombré, French or hand-painted art.'],
  ];
  for (const [c, name, price, duration, description] of services) {
    const s = await db.service.create({ data: { categoryId: cat[c], name, price, duration, description } });
    svc[name] = s;
  }

  // ── Products ──────────────────────────────────────────────
  const prod: Record<string, { id: string; name: string; price: number; stock: number }> = {};
  const products: [string, string, string, string, number, number, number, number][] = [
    ['Argan Hydrating Shampoo 250ml', 'HC-001', 'Hair Care', "L'Oréal Professional", 420, 780, 24, 5],
    ['Keratin Smooth Conditioner 250ml', 'HC-002', 'Hair Care', "L'Oréal Professional", 380, 690, 18, 5],
    ['Golden Hair Serum 100ml', 'HC-003', 'Hair Care', 'Kérastase', 950, 1750, 14, 4],
    ['Cuticle Revitalising Oil 15ml', 'NC-001', 'Nail Care', 'OPI Distributors', 160, 380, 32, 6],
    ['Gel Polish Gift Trio', 'NC-002', 'Nail Care', 'Gelish', 650, 1350, 4, 6],
    ['Professional Hair Spray 300ml', 'SP-001', 'Styling', "L'Oréal Professional", 320, 650, 20, 5],
  ];
  const shelf = new Map<string, number>(); // running count per product and branch
  const suppliers: Record<string, string> = {};
  for (const name of new Set(products.map((p) => p[3]))) suppliers[name] = (await db.supplier.create({ data: { name } })).id;
  for (const [name, sku, category, supplier, costPrice, price, stock, reorderLevel] of products) {
    const p = await db.product.create({ data: { name, sku, category, supplierId: suppliers[supplier], costPrice, price, stock, reorderLevel } });
    // Opening stock is split between the two branches, 60% and 40%.
    const spazeQty = Math.floor(stock * 0.4);
    for (const [branchId, qty] of [[huda.id, stock - spazeQty], [spaze.id, spazeQty]] as const) {
      shelf.set(`${p.id}|${branchId}`, qty);
      if (qty > 0) await db.stockMovement.create({ data: { productId: p.id, type: 'IN', change: qty, balance: qty, note: 'Opening stock', supplierId: suppliers[supplier], branchId } });
    }
    prod[name] = p;
  }

  // ── Customers ─────────────────────────────────────────────
  const mkCustomer = (name: string, phone: string, gender: string, extra: object) =>
    db.customer.create({ data: { name, phone, gender, ...extra } });
  const meera = await mkCustomer('Meera Joshi', '+91 99001 10001', 'Female', {
    hairNotes: 'Long layers with curtain bangs. Warm chocolate balayage. Sensitive scalp.',
    nailNotes: 'Nude or blush gel, almond extensions with chrome glaze.',
    notes: 'VIP. Prefers oat-milk cappuccino.', preferredStaffId: rahul.id,
  });
  const sneha = await mkCustomer('Sneha Patel', '+91 99001 10002', 'Female', {
    hairNotes: 'Keratin every 4 months. Ammonia-free root touch-up only.',
    nailNotes: 'Red and burgundy gel, short square nails.', notes: 'Books morning slots before 11 AM.', preferredStaffId: neha.id,
  });
  const vikram = await mkCustomer('Vikram Sengupta', '+91 99001 10003', 'Male', {
    hairNotes: 'Side taper fade, textured crop. Sharp beard lines.', notes: 'Values punctuality.', preferredStaffId: arjun.id,
  });
  const ananya = await mkCustomer('Ananya Deshmukh', '+91 99001 10004', 'Female', {
    hairNotes: 'Voluminous blow-dry. Argan spa every 3 weeks.',
    nailNotes: 'Gel extensions with gold-foil line art.', notes: 'Bridal package client.', preferredStaffId: neha.id,
  });
  const karan = await mkCustomer('Karan Malhotra', '+91 99001 10005', 'Male', {
    hairNotes: 'Classic scissor cut, matte pomade.', preferredStaffId: arjun.id,
  });
  const rhea = await mkCustomer('Rhea Chakraborty', '+91 99001 10006', 'Female', {
    hairNotes: 'Honey blonde highlights, ash toner. Sulphate-free products.',
    nailNotes: 'Cat-eye velvet gel, medium coffin.', notes: 'Influencer. Tag the salon on posts.', preferredStaffId: pooja.id,
  });

  // ── Appointments ──────────────────────────────────────────
  async function book(customerId: string, staffId: string, branchId: string, date: string, start: string, names: string[], status: string, notes?: string) {
    const list = names.map((n) => svc[n]);
    const duration = list.reduce((a, s) => a + s.duration, 0);
    return db.appointment.create({
      data: {
        customerId, staffId, branchId, date, startTime: start, endTime: fromMinutes(toMinutes(start) + duration), status, notes,
        services: { create: list.map((s) => ({ serviceId: s.id, name: s.name, price: s.price, duration: s.duration })) },
      },
    });
  }

  const a1 = await book(meera.id, rahul.id, huda.id, today, '09:30', ["Women's Signature Haircut"], 'Completed');
  await book(sneha.id, neha.id, huda.id, today, '11:00', ['Gel Polish Manicure', 'Spa Pedicure'], 'InService');
  await book(vikram.id, arjun.id, spaze.id, today, '13:30', ["Men's Executive Haircut"], 'CheckedIn', 'Walk-in, waiting in the lounge.');
  await book(ananya.id, pooja.id, huda.id, today, '15:00', ['Global Ammonia-Free Colour'], 'Booked');
  await book(rhea.id, neha.id, spaze.id, today, '17:30', ['Gel Extensions (Full Set)', 'Designer Nail Art (10 nails)'], 'Booked');
  await book(meera.id, pooja.id, huda.id, addDays(today, 1), '10:00', ['Balayage & Toning'], 'Booked');
  await book(karan.id, arjun.id, spaze.id, addDays(today, 1), '14:00', ["Men's Executive Haircut"], 'Booked');

  // ── Invoices ──────────────────────────────────────────────
  let next = 1001;
  async function bill(opts: {
    customerId: string; branchId: string; daysAgo: number; appointmentId?: string;
    lines: { service?: string; product?: string; staffId?: string; qty?: number }[];
    discount?: { type: 'percent' | 'amount'; value: number };
    noGst?: boolean;
    payments: { amount?: number; method: string; reference?: string }[];
  }) {
    const raw = opts.lines.map((l) => {
      const item = l.service ? svc[l.service] : prod[l.product!];
      return { kind: l.service ? 'service' : 'product', ref: item, staffId: l.staffId ?? null, qty: l.qty ?? 1, unitPrice: item.price, taxRate: opts.noGst ? 0 : GST };
    });
    const calc = computeBill(raw, opts.discount ?? { type: null, value: 0 });
    const createdAt = new Date(Date.now() - opts.daysAgo * 86400000);
    // A payment without an amount pays whatever is left.
    let left = calc.total;
    const payments = opts.payments.map((p) => { const amount = p.amount ?? left; left -= amount; return { ...p, amount }; });
    const paid = payments.reduce((a, p) => a + p.amount, 0);
    const number = `SP${next++}`;
    const inv = await db.invoice.create({
      data: {
        number, createdBy: 'Shruti Pahwa', customerId: opts.customerId, branchId: opts.branchId, appointmentId: opts.appointmentId,
        subtotal: calc.subtotal, discountType: opts.discount?.type ?? null, discountValue: opts.discount?.value ?? 0,
        discount: calc.discount, tax: calc.tax, total: calc.total, paid, status: invoiceStatus(calc.total, paid), createdAt,
        items: {
          create: raw.map((r, i) => ({
            kind: r.kind, serviceId: r.kind === 'service' ? r.ref.id : null, productId: r.kind === 'product' ? r.ref.id : null,
            staffId: r.staffId, name: r.ref.name, qty: r.qty, unitPrice: r.unitPrice, taxRate: r.taxRate,
            discount: calc.lines[i].discount, tax: calc.lines[i].tax, total: calc.lines[i].total,
          })),
        },
        payments: { create: payments.map((p) => ({ amount: p.amount, method: p.method, reference: p.reference, createdAt })) },
      },
    });
    for (const r of raw.filter((r) => r.kind === 'product')) {
      const p = await db.product.update({ where: { id: r.ref.id }, data: { stock: { decrement: r.qty } } });
      const left = (shelf.get(`${p.id}|${opts.branchId}`) ?? 0) - r.qty;
      shelf.set(`${p.id}|${opts.branchId}`, left);
      await db.stockMovement.create({ data: { productId: p.id, type: 'SALE', change: -r.qty, balance: left, invoiceId: inv.id, branchId: opts.branchId, note: `Sold on ${number}`, createdAt } });
    }
    return inv;
  }

  await bill({ customerId: meera.id, branchId: huda.id, daysAgo: 0, appointmentId: a1.id,
    lines: [{ service: "Women's Signature Haircut", staffId: rahul.id }, { product: 'Argan Hydrating Shampoo 250ml' }],
    payments: [{ method: 'UPI', reference: 'UPI 983721' }] });
  await bill({ customerId: rhea.id, branchId: spaze.id, daysAgo: 1,
    lines: [{ service: 'Balayage & Toning', staffId: pooja.id }, { product: 'Golden Hair Serum 100ml' }],
    discount: { type: 'amount', value: 500 },
    payments: [{ amount: 3000, method: 'Cash' }, { method: 'UPI', reference: 'GPay 89472' }] });
  await bill({ customerId: ananya.id, branchId: huda.id, daysAgo: 2,
    lines: [{ service: 'Gel Extensions (Full Set)', staffId: neha.id }, { service: 'Designer Nail Art (10 nails)', staffId: neha.id }],
    payments: [{ method: 'Card', reference: 'HDFC POS 9912' }] });
  await bill({ customerId: sneha.id, branchId: spaze.id, daysAgo: 3,
    lines: [{ service: 'Brazilian Keratin', staffId: rahul.id }],
    payments: [{ amount: 5000, method: 'UPI', reference: 'GPay 3921' }] });
  await bill({ customerId: meera.id, branchId: huda.id, daysAgo: 4,
    lines: [{ service: 'Gel Polish Manicure', staffId: kavitha.id }, { service: 'Spa Pedicure', staffId: kavitha.id }],
    discount: { type: 'percent', value: 10 },
    payments: [{ method: 'Card' }] });
  await bill({ customerId: vikram.id, branchId: spaze.id, daysAgo: 5,
    lines: [{ service: "Men's Executive Haircut", staffId: arjun.id }, { product: 'Professional Hair Spray 300ml' }],
    payments: [{ method: 'UPI' }] });
  await bill({ customerId: ananya.id, branchId: huda.id, daysAgo: 6,
    lines: [{ service: 'Argan Detox Hair Spa', staffId: rahul.id }],
    payments: [{ method: 'Cash' }] });
  await bill({ customerId: karan.id, branchId: spaze.id, daysAgo: 9,
    lines: [{ service: "Men's Executive Haircut", staffId: arjun.id }], noGst: true,
    payments: [{ method: 'Cash' }] });
  await db.settings.update({ where: { id: 1 }, data: { nextInvoiceNo: next } });

  // ── Expenses ──────────────────────────────────────────────
  const expenses: [number, string, string, number, string, string][] = [
    [10, 'Rent', 'Monthly lease, Huda Market', 48000, 'Bank', 'Property owner'],
    [4, 'Salaries', 'Stylist salary advances', 38500, 'Bank', 'Payroll'],
    [6, 'Utilities', 'Electricity bill', 7200, 'UPI', 'DHBVN'],
    [8, 'Product restock', "L'Oréal colour tubes, bleach and developer", 16800, 'Card', 'Beauty Wholesale India'],
    [2, 'Laundry', 'Towels and capes', 3400, 'Cash', 'CleanFast Laundry'],
    [5, 'Marketing', 'Instagram ads for bridal balayage', 5500, 'Card', 'Meta Ads'],
    [1, 'Refreshments', 'Coffee beans, almond milk, green tea', 2100, 'UPI', 'Local store'],
    [7, 'Maintenance', 'Dryer service and chair hydraulics', 2800, 'Cash', 'ProSalon Repairs'],
  ];
  for (const [d, category, description, amount, method, vendor] of expenses) {
    await db.expense.create({ data: { date: addDays(today, -d), category, description, amount, method, vendor, branchId: huda.id } });
  }

  console.log('Demo data ready. Sign in with admin@salon.com / admin123.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
