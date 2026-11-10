import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { subDays, addDays, startOfDay, addMinutes, format } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding complete salon database with realistic sample data...');

  // Clean existing transactional data first to prevent duplicates
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.appointmentService.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.expenseCategory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.productCategory.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.serviceCategory.deleteMany({});
  await prisma.staffAvailability.deleteMany({});
  await prisma.staffLeave.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.taxSetting.deleteMany({});
  await prisma.salonSettings.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.branch.deleteMany({});

  // ─── 1. Roles & Permissions ───────────────────────────────
  const ownerRole = await prisma.role.create({
    data: { name: 'Owner', description: 'Full executive and financial access', isSystem: true },
  });
  const managerRole = await prisma.role.create({
    data: { name: 'Manager', description: 'Operational oversight and staff management', isSystem: true },
  });
  const receptionistRole = await prisma.role.create({
    data: { name: 'Receptionist', description: 'Front desk, appointments, and billing', isSystem: true },
  });
  const stylistRole = await prisma.role.create({
    data: { name: 'Stylist', description: 'Appointments, customer preferences and schedule', isSystem: true },
  });

  const modules = ['dashboard', 'appointments', 'billing', 'customers', 'services', 'staff', 'inventory', 'expenses', 'reports', 'settings'];
  const actions = ['create', 'read', 'update', 'delete'];
  
  for (const module of modules) {
    for (const action of actions) {
      const perm = await prisma.permission.create({
        data: { module, action, description: `${action} ${module}` },
      });
      // Grant to owner
      await prisma.rolePermission.create({
        data: { roleId: ownerRole.id, permissionId: perm.id, granted: true },
      });
      // Grant to manager (all except settings delete)
      if (module !== 'settings' || action === 'read') {
        await prisma.rolePermission.create({
          data: { roleId: managerRole.id, permissionId: perm.id, granted: true },
        });
      }
      // Grant to receptionist
      if (['dashboard', 'appointments', 'billing', 'customers'].includes(module)) {
        await prisma.rolePermission.create({
          data: { roleId: receptionistRole.id, permissionId: perm.id, granted: true },
        });
      }
    }
  }

  // ─── 2. User Accounts ─────────────────────────────────────
  const adminHash = await hash('admin123', 12);
  await prisma.user.create({
    data: {
      email: 'admin@salon.com',
      name: 'Shruti Pahwa (Owner)',
      passwordHash: adminHash,
      phone: '+91 98765 43210',
      roleId: ownerRole.id,
    },
  });

  const managerHash = await hash('manager123', 12);
  await prisma.user.create({
    data: {
      email: 'manager@salon.com',
      name: 'Priya Sharma (Manager)',
      passwordHash: managerHash,
      phone: '+91 98765 43211',
      roleId: managerRole.id,
    },
  });

  const receptionistHash = await hash('reception123', 12);
  await prisma.user.create({
    data: {
      email: 'reception@salon.com',
      name: 'Anita Verma (Front Desk)',
      passwordHash: receptionistHash,
      phone: '+91 98765 43212',
      roleId: receptionistRole.id,
    },
  });

  // ─── 3. Salon Settings & Taxes ───────────────────────────
  const settings = await prisma.salonSettings.create({
    data: {
      name: 'Shruti Pahwa Luxury Salon and academy',
      address: 'Plot 42, 100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      zipCode: '560038',
      country: 'India',
      phone: '+91 80 4567 8901',
      email: 'concierge@luxestudio.com',
      website: 'https://luxestudio.com',
      gstin: '29ABCDE1234F1Z5',
      currency: 'INR',
      currencySymbol: '₹',
      timeZone: 'Asia/Kolkata',
      openTime: '09:00',
      closeTime: '21:00',
      slotDuration: 30,
      invoicePrefix: 'LXS',
      invoiceNextNum: 1016, // after seed invoices
    },
  });

  const tax18 = await prisma.taxSetting.create({
    data: { name: 'GST 18%', rate: 18, isActive: true, isDefault: true, salonSettingsId: settings.id },
  });
  const tax12 = await prisma.taxSetting.create({
    data: { name: 'GST 12%', rate: 12, isActive: true, isDefault: false, salonSettingsId: settings.id },
  });
  const tax5 = await prisma.taxSetting.create({
    data: { name: 'GST 5%', rate: 5, isActive: true, isDefault: false, salonSettingsId: settings.id },
  });
  const tax0 = await prisma.taxSetting.create({
    data: { name: 'Exempt 0%', rate: 0, isActive: true, isDefault: false, salonSettingsId: settings.id },
  });

  // ─── 5. Branches ────────────────────────────────────────
  const branch1 = await prisma.branch.create({
    data: {
      name: 'Huda Market',
      address: 'Sector 46, Gurugram',
    },
  });

  const branch2 = await prisma.branch.create({
    data: {
      name: 'Spaze Corporate Park',
      address: 'Sector 69, Gurugram',
    },
  });

  const staff1 = await prisma.staff.create({
    data: {
      name: 'Rahul Mehra',
      phone: '+91 99887 76601',
      email: 'rahul.m@luxestudio.com',
      gender: 'Male',
      role: 'Senior Stylist',
      commissionRate: 30,
      specializations: JSON.stringify(['Haircut', 'Hair Colouring', 'Hair Spa', 'Balayage', 'Keratin']),
    },
  });

  const staff2 = await prisma.staff.create({
    data: {
      name: 'Neha Kapoor',
      phone: '+91 99887 76602',
      email: 'neha.k@luxestudio.com',
      gender: 'Female',
      role: 'Senior Nail Artist',
      commissionRate: 30,
      specializations: JSON.stringify(['Manicure', 'Pedicure', 'Nail Art', 'Nail Extensions', 'Gel Nails']),
    },
  });

  const staff3 = await prisma.staff.create({
    data: {
      name: 'Arjun Reddy',
      phone: '+91 99887 76603',
      email: 'arjun.r@luxestudio.com',
      gender: 'Male',
      role: 'Stylist',
      commissionRate: 25,
      specializations: JSON.stringify(['Haircut', 'Hair Styling', 'Beard Grooming', 'Hair Spa']),
    },
  });

  const staff4 = await prisma.staff.create({
    data: {
      name: 'Kavitha Nair',
      phone: '+91 99887 76604',
      email: 'kavitha.n@luxestudio.com',
      gender: 'Female',
      role: 'Nail Technician',
      commissionRate: 25,
      specializations: JSON.stringify(['Manicure', 'Pedicure', 'Gel Polish', 'French Tips']),
    },
  });

  const staff5 = await prisma.staff.create({
    data: {
      name: 'Pooja Verma',
      phone: '+91 99887 76605',
      email: 'pooja.v@luxestudio.com',
      gender: 'Female',
      role: 'Master Colorist',
      commissionRate: 35,
      specializations: JSON.stringify(['Balayage', 'Global Hair Colour', 'Highlights', 'Root Touch-up']),
    },
  });

  // Staff availability Mon-Sat 09:00 - 20:00
  const allStaff = [staff1, staff2, staff3, staff4, staff5];
  for (const s of allStaff) {
    for (let day = 1; day <= 6; day++) {
      await prisma.staffAvailability.create({
        data: { staffId: s.id, dayOfWeek: day, startTime: '09:00', endTime: '20:00', isOff: false },
      });
    }
    await prisma.staffAvailability.create({
      data: { staffId: s.id, dayOfWeek: 0, startTime: '09:00', endTime: '20:00', isOff: true },
    });
  }

  // ─── 5. Service Categories & Services ─────────────────────
  const catHaircut = await prisma.serviceCategory.create({ data: { name: 'Haircut & Styling', sortOrder: 1 } });
  const catColour = await prisma.serviceCategory.create({ data: { name: 'Hair Colouring', sortOrder: 2 } });
  const catSpa = await prisma.serviceCategory.create({ data: { name: 'Hair Spa & Treatments', sortOrder: 3 } });
  const catManicure = await prisma.serviceCategory.create({ data: { name: 'Manicure', sortOrder: 4 } });
  const catPedicure = await prisma.serviceCategory.create({ data: { name: 'Pedicure', sortOrder: 5 } });
  const catNailExt = await prisma.serviceCategory.create({ data: { name: 'Nail Extensions', sortOrder: 6 } });
  const catNailArt = await prisma.serviceCategory.create({ data: { name: 'Nail Art & Gel', sortOrder: 7 } });

  // Services Map
  const svcWomensHaircut = await prisma.service.create({
    data: { name: "Women's Signature Haircut", categoryId: catHaircut.id, price: 950, duration: 45, taxSettingId: tax18.id, description: 'Includes consultation, hair wash, precision layer cut and blow-dry styling.' },
  });
  const svcMensHaircut = await prisma.service.create({
    data: { name: "Men's Executive Haircut", categoryId: catHaircut.id, price: 600, duration: 30, taxSettingId: tax18.id, description: 'Precision fade or classic scissor cut with shampoo and head massage.' },
  });
  const svcBlowDry = await prisma.service.create({
    data: { name: 'Glam Blow Dry & Styling', categoryId: catHaircut.id, price: 750, duration: 35, taxSettingId: tax18.id, description: 'Bouncy curls or sleek straight finish using heat protectant serums.' },
  });
  const svcBalayage = await prisma.service.create({
    data: { name: 'Custom Balayage & Toning', categoryId: catColour.id, price: 5800, duration: 180, taxSettingId: tax18.id, description: 'Hand-painted sun-kissed dimension with custom gloss toner.' },
  });
  const svcGlobalColour = await prisma.service.create({
    data: { name: 'Global Ammonia-Free Colour', categoryId: catColour.id, price: 3400, duration: 120, taxSettingId: tax18.id, description: 'Full root-to-tip vibrant color with deep shine treatment.' },
  });
  const svcRootTouchup = await prisma.service.create({
    data: { name: 'Root Touch-up & Grey Coverage', categoryId: catColour.id, price: 1800, duration: 60, taxSettingId: tax18.id, description: 'Seamless grey blending and root matching.' },
  });
  const svcKeratin = await prisma.service.create({
    data: { name: 'Brazilian Keratin Infusion', categoryId: catSpa.id, price: 6500, duration: 180, taxSettingId: tax18.id, description: 'Frizz-free smoothness, shine and manageable texture for up to 4 months.' },
  });
  const svcHairSpa = await prisma.service.create({
    data: { name: 'Moroccan Argan Detox Hair Spa', categoryId: catSpa.id, price: 1600, duration: 60, taxSettingId: tax18.id, description: 'Deep scalp exfoliation, steam infusion and hydrating hair mask.' },
  });
  const svcGelManicure = await prisma.service.create({
    data: { name: 'Gel Polish Manicure', categoryId: catManicure.id, price: 1200, duration: 45, taxSettingId: tax18.id, description: 'Cuticle care, nail shaping, hand massage and UV LED long-lasting gel polish.' },
  });
  const svcClassicMani = await prisma.service.create({
    data: { name: 'Classic Deluxe Manicure', categoryId: catManicure.id, price: 750, duration: 35, taxSettingId: tax18.id, description: 'Gentle exfoliation, massage and premium lacquer finish.' },
  });
  const svcSpaPedicure = await prisma.service.create({
    data: { name: 'Rose Petal Spa Pedicure', categoryId: catPedicure.id, price: 1600, duration: 60, taxSettingId: tax18.id, description: 'Warm foot soak, sea salt scrub, callus buffing, paraffin mask and massage.' },
  });
  const svcClassicPedi = await prisma.service.create({
    data: { name: 'Classic Refresh Pedicure', categoryId: catPedicure.id, price: 950, duration: 40, taxSettingId: tax18.id, description: 'Foot soak, scrub, nail shaping and massage.' },
  });
  const svcNailExtensions = await prisma.service.create({
    data: { name: 'Gel Nail Extensions (Full Set)', categoryId: catNailExt.id, price: 3200, duration: 90, taxSettingId: tax18.id, description: 'Hard gel sculptured extensions with custom shape (Almond / Coffin / Square).' },
  });
  const svcNailArt = await prisma.service.create({
    data: { name: 'Designer Nail Art (All 10 Nails)', categoryId: catNailArt.id, price: 1800, duration: 60, taxSettingId: tax18.id, description: 'Chrome powder, ombré, French tips or hand-painted aesthetic motifs.' },
  });

  // ─── 6. Suppliers & Retail Products ───────────────────────
  const sup1 = await prisma.supplier.create({
    data: { name: 'L’Oréal Professional & Kérastase India', contactName: 'Rajesh Gupta', phone: '+91 98112 23344', email: 'orders@lorealpro.in', address: 'Bandra Kurla Complex, Mumbai' },
  });
  const sup2 = await prisma.supplier.create({
    data: { name: 'OPI & Gelish Nail Supplies', contactName: 'Sunita Nair', phone: '+91 98223 34455', email: 'orders@opidistributors.in', address: 'Indiranagar, Bengaluru' },
  });

  const pcHair = await prisma.productCategory.create({ data: { name: 'Hair Care & Serums' } });
  const pcNail = await prisma.productCategory.create({ data: { name: 'Nail Care & Oils' } });
  const pcStyling = await prisma.productCategory.create({ data: { name: 'Styling & Finishing' } });

  const prodShampoo = await prisma.product.create({
    data: { name: 'Moroccan Argan Hydrating Shampoo 250ml', categoryId: pcHair.id, sku: 'HC-001', barcode: '890123456001', purchasePrice: 420, sellingPrice: 780, stock: 24, minStockLevel: 5, supplierId: sup1.id },
  });
  const prodConditioner = await prisma.product.create({
    data: { name: 'Keratin Smooth Conditioner 250ml', categoryId: pcHair.id, sku: 'HC-002', barcode: '890123456002', purchasePrice: 380, sellingPrice: 690, stock: 18, minStockLevel: 5, supplierId: sup1.id },
  });
  const prodSerum = await prisma.product.create({
    data: { name: 'Elixir Ultime Golden Hair Serum 100ml', categoryId: pcHair.id, sku: 'HC-003', barcode: '890123456003', purchasePrice: 950, sellingPrice: 1750, stock: 14, minStockLevel: 4, supplierId: sup1.id },
  });
  const prodCuticleOil = await prisma.product.create({
    data: { name: 'ProSpa Cuticle Revitalizing Oil 15ml', categoryId: pcNail.id, sku: 'NC-001', barcode: '890123456004', purchasePrice: 160, sellingPrice: 380, stock: 32, minStockLevel: 6, supplierId: sup2.id },
  });
  const prodNailKit = await prisma.product.create({
    data: { name: 'Gelish Mini Nail Polish Gift Trio', categoryId: pcNail.id, sku: 'NC-002', barcode: '890123456005', purchasePrice: 650, sellingPrice: 1350, stock: 4, minStockLevel: 6, supplierId: sup2.id }, // Trigger Low Stock!
  });
  const prodSpray = await prisma.product.create({
    data: { name: 'Infinium Professional Hair Spray 300ml', categoryId: pcStyling.id, sku: 'SP-001', barcode: '890123456006', purchasePrice: 320, sellingPrice: 650, stock: 20, minStockLevel: 5, supplierId: sup1.id },
  });

  // Opening stock logs
  for (const p of [prodShampoo, prodConditioner, prodSerum, prodCuticleOil, prodNailKit, prodSpray]) {
    await prisma.inventoryTransaction.create({
      data: { productId: p.id, type: 'IN', quantity: p.stock, previousStock: 0, newStock: p.stock, reason: 'Initial Opening Stock' },
    });
  }

  // ─── 7. Clients (CRM) ─────────────────────────────────────
  const cust1 = await prisma.customer.create({
    data: {
      name: 'Meera Joshi',
      phone: '+91 99001 10001',
      email: 'meera.joshi@gmail.com',
      gender: 'Female',
      address: '12th Main, HAL 2nd Stage, Indiranagar',
      hairPreferences: 'Long layers, face-framing curtain bangs. Prefers warm chocolate balayage tones. Sensitive scalp.',
      nailPreferences: 'Loves nude/blush gel polish, French almond shaped extensions with subtle chrome glaze.',
      notes: 'VIP Client. Prefers hot cappuccino with oat milk. Never uses high heat on hair without protectant.',
      preferredStaffId: staff1.id,
      totalSpent: 14850,
      visitCount: 6,
      lastVisitAt: subDays(new Date(), 2),
    },
  });

  const cust2 = await prisma.customer.create({
    data: {
      name: 'Sneha Patel',
      phone: '+91 99001 10002',
      email: 'sneha.patel@outlook.com',
      gender: 'Female',
      address: 'Def Colony, Domlur, Bengaluru',
      hairPreferences: 'Keratin treatment once every 4 months. Ammonia-free global root touch-up.',
      nailPreferences: 'Prefers vibrant red and burgundy gel polish, short square natural nails.',
      notes: 'Always books morning slots before 11 AM.',
      preferredStaffId: staff2.id,
      totalSpent: 9800,
      visitCount: 4,
      lastVisitAt: subDays(new Date(), 5),
    },
  });

  const cust3 = await prisma.customer.create({
    data: {
      name: 'Vikram Sengupta',
      phone: '+91 99001 10003',
      email: 'vikram.sengupta@techcorp.io',
      gender: 'Male',
      address: 'Koramangala 4th Block, Bengaluru',
      hairPreferences: 'Clean side taper fade with textured crop on top. Beard trimming with sharp cheek lines.',
      nailPreferences: 'Regular clean buff manicure every month.',
      notes: 'Corporate regular. Values punctuality.',
      preferredStaffId: staff3.id,
      totalSpent: 4200,
      visitCount: 5,
      lastVisitAt: subDays(new Date(), 8),
    },
  });

  const cust4 = await prisma.customer.create({
    data: {
      name: 'Ananya Deshmukh',
      phone: '+91 99001 10004',
      email: 'ananya.d@gmail.com',
      gender: 'Female',
      address: 'Lavelle Road, Bengaluru',
      hairPreferences: 'Voluminous blow-dry, Moroccan Argan hair spa every 3 weeks.',
      nailPreferences: 'Full set Gel extensions with minimalist geometric line art in gold foil.',
      notes: 'Pre-wedding bridal package client.',
      preferredStaffId: staff2.id,
      totalSpent: 18500,
      visitCount: 7,
      lastVisitAt: subDays(new Date(), 1),
    },
  });

  const cust5 = await prisma.customer.create({
    data: {
      name: 'Karan Malhotra',
      phone: '+91 99001 10005',
      email: 'karan.m@gmail.com',
      gender: 'Male',
      address: 'Richmond Town, Bengaluru',
      hairPreferences: 'Classic gentleman scissor cut with matte finish pomade.',
      notes: 'Enjoys espresso during head massage.',
      preferredStaffId: staff3.id,
      totalSpent: 2400,
      visitCount: 3,
      lastVisitAt: subDays(new Date(), 12),
    },
  });

  const cust6 = await prisma.customer.create({
    data: {
      name: 'Rhea Chakraborty',
      phone: '+91 99001 10006',
      email: 'rhea.c@gmail.com',
      gender: 'Female',
      address: 'Sadashivanagar, Bengaluru',
      hairPreferences: 'Honey blonde highlights with ash toner. Prefers sulphate-free shampoos.',
      nailPreferences: 'Cat-eye velvet gel polish, medium coffin nails.',
      notes: 'VIP influencer client. Always logs Instagram tag.',
      preferredStaffId: staff5.id,
      totalSpent: 22600,
      visitCount: 8,
      lastVisitAt: new Date(),
    },
  });

  // ─── 8. Comprehensive Appointments (Past, Today & Upcoming) ──
  const now = new Date();
  const todayStart = startOfDay(now);

  console.log('Creating sample appointments across today, past and upcoming days...');

  // TODAY'S APPOINTMENT 1: 09:30 AM (Completed)
  const apptToday1 = await prisma.appointment.create({
    data: {
      customerId: cust1.id,
      staffId: staff1.id,
      date: todayStart,
      startTime: '09:30',
      endTime: '10:15',
      totalDuration: 45,
      status: 'Completed',
      notes: 'Signature haircut with light face-framing layers.',
      isWalkIn: false,
      services: {
        create: { serviceId: svcWomensHaircut.id, staffId: staff1.id, price: svcWomensHaircut.price, duration: svcWomensHaircut.duration },
      },
    },
  });

  // TODAY'S APPOINTMENT 2: 11:00 AM (In Progress)
  const apptToday2 = await prisma.appointment.create({
    data: {
      customerId: cust2.id,
      staffId: staff2.id,
      date: todayStart,
      startTime: '11:00',
      endTime: '12:45',
      totalDuration: 105,
      status: 'InProgress',
      notes: 'Gel manicure plus deluxe rose pedicure.',
      isWalkIn: false,
      services: {
        create: [
          { serviceId: svcGelManicure.id, staffId: staff2.id, price: svcGelManicure.price, duration: svcGelManicure.duration },
          { serviceId: svcSpaPedicure.id, staffId: staff2.id, price: svcSpaPedicure.price, duration: svcSpaPedicure.duration },
        ],
      },
    },
  });

  // TODAY'S APPOINTMENT 3: 13:30 PM (Checked In)
  const apptToday3 = await prisma.appointment.create({
    data: {
      customerId: cust3.id,
      staffId: staff3.id,
      date: todayStart,
      startTime: '13:30',
      endTime: '14:00',
      totalDuration: 30,
      status: 'CheckedIn',
      notes: 'Client arrived, waiting at lounge with green tea.',
      isWalkIn: true,
      services: {
        create: { serviceId: svcMensHaircut.id, staffId: staff3.id, price: svcMensHaircut.price, duration: svcMensHaircut.duration },
      },
    },
  });

  // TODAY'S APPOINTMENT 4: 15:00 PM (Confirmed)
  const apptToday4 = await prisma.appointment.create({
    data: {
      customerId: cust4.id,
      staffId: staff5.id,
      date: todayStart,
      startTime: '15:00',
      endTime: '17:00',
      totalDuration: 120,
      status: 'Confirmed',
      notes: 'Global hair coloring with conditioning gloss treatment.',
      isWalkIn: false,
      services: {
        create: { serviceId: svcGlobalColour.id, staffId: staff5.id, price: svcGlobalColour.price, duration: svcGlobalColour.duration },
      },
    },
  });

  // TODAY'S APPOINTMENT 5: 17:30 PM (Confirmed)
  const apptToday5 = await prisma.appointment.create({
    data: {
      customerId: cust6.id,
      staffId: staff2.id,
      date: todayStart,
      startTime: '17:30',
      endTime: '19:00',
      totalDuration: 90,
      status: 'Confirmed',
      notes: 'Full set Gel extensions with designer nail art.',
      isWalkIn: false,
      services: {
        create: [
          { serviceId: svcNailExtensions.id, staffId: staff2.id, price: svcNailExtensions.price, duration: svcNailExtensions.duration },
          { serviceId: svcNailArt.id, staffId: staff2.id, price: svcNailArt.price, duration: svcNailArt.duration },
        ],
      },
    },
  });

  // UPCOMING APPOINTMENTS (Tomorrow & Day After)
  await prisma.appointment.create({
    data: {
      customerId: cust1.id,
      staffId: staff5.id,
      date: startOfDay(addDays(now, 1)),
      startTime: '10:00',
      endTime: '13:00',
      totalDuration: 180,
      status: 'Confirmed',
      notes: 'Custom Balayage & Toning Session.',
      isWalkIn: false,
      services: {
        create: { serviceId: svcBalayage.id, staffId: staff5.id, price: svcBalayage.price, duration: svcBalayage.duration },
      },
    },
  });

  await prisma.appointment.create({
    data: {
      customerId: cust5.id,
      staffId: staff3.id,
      date: startOfDay(addDays(now, 1)),
      startTime: '14:00',
      endTime: '14:30',
      totalDuration: 30,
      status: 'Confirmed',
      notes: 'Executive haircut.',
      isWalkIn: false,
      services: {
        create: { serviceId: svcMensHaircut.id, staffId: staff3.id, price: svcMensHaircut.price, duration: svcMensHaircut.duration },
      },
    },
  });

  // PAST APPOINTMENTS (Past 7 days)
  const pastDays = [1, 2, 3, 4, 5, 6, 7];
  for (const daysAgo of pastDays) {
    const pastDate = startOfDay(subDays(now, daysAgo));
    await prisma.appointment.create({
      data: {
        customerId: daysAgo % 2 === 0 ? cust2.id : cust4.id,
        staffId: daysAgo % 2 === 0 ? staff1.id : staff4.id,
        date: pastDate,
        startTime: '11:00',
        endTime: '12:00',
        totalDuration: 60,
        status: 'Completed',
        isWalkIn: daysAgo % 3 === 0,
        services: {
          create: { serviceId: svcHairSpa.id, staffId: staff1.id, price: svcHairSpa.price, duration: svcHairSpa.duration },
        },
      },
    });
  }

  // ─── 9. POS Invoices & Payment Records (7 Days + Today) ───
  console.log('Generating POS invoices, line items, and split payments...');

  // Invoice 1: Today – Huda Market – Women's Haircut + Shampoo
  const inv1Subtotal = 950 + 780;
  const inv1Tax = (inv1Subtotal * 18) / 100;
  const inv1Total = inv1Subtotal + inv1Tax;

  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'LXS1001',
      customerId: cust1.id,
      appointmentId: apptToday1.id,
      branchId: branch1.id,
      subtotal: inv1Subtotal,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      taxAmount: inv1Tax,
      totalAmount: inv1Total,
      paidAmount: inv1Total,
      balanceAmount: 0,
      status: 'Paid',
      createdAt: new Date(),
      items: {
        create: [
          { type: 'service', serviceId: svcWomensHaircut.id, name: svcWomensHaircut.name, quantity: 1, unitPrice: 950, taxRate: 18, taxAmount: (950 * 18) / 100, totalPrice: 950 * 1.18 },
          { type: 'product', productId: prodShampoo.id, name: prodShampoo.name, quantity: 1, unitPrice: 780, taxRate: 18, taxAmount: (780 * 18) / 100, totalPrice: 780 * 1.18 },
        ],
      },
      payments: {
        create: { amount: inv1Total, method: 'UPI', reference: 'UPI/983721/PAYTM', createdAt: new Date() },
      },
    },
  });

  // Invoice 2: 1 Day Ago – Spaze Corporate Park – Balayage + Hair Serum (Split Payment)
  const inv2Sub = 5800 + 1750;
  const inv2Disc = 500;
  const inv2Taxable = inv2Sub - inv2Disc;
  const inv2Tax = (inv2Taxable * 18) / 100;
  const inv2Total = inv2Taxable + inv2Tax;

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'LXS1002',
      customerId: cust6.id,
      branchId: branch2.id,
      subtotal: inv2Sub,
      discountType: 'fixed',
      discountValue: 500,
      discountAmount: 500,
      taxAmount: inv2Tax,
      totalAmount: inv2Total,
      paidAmount: inv2Total,
      balanceAmount: 0,
      status: 'Paid',
      createdAt: subDays(now, 1),
      items: {
        create: [
          { type: 'service', serviceId: svcBalayage.id, name: svcBalayage.name, quantity: 1, unitPrice: 5800, taxRate: 18, taxAmount: (5800 * 18) / 100, totalPrice: 5800 * 1.18 },
          { type: 'product', productId: prodSerum.id, name: prodSerum.name, quantity: 1, unitPrice: 1750, taxRate: 18, taxAmount: (1750 * 18) / 100, totalPrice: 1750 * 1.18 },
        ],
      },
      payments: {
        create: [
          { amount: 3000, method: 'Cash', reference: 'Cash Counter A', createdAt: subDays(now, 1) },
          { amount: inv2Total - 3000, method: 'UPI', reference: 'GPAY-REF-89472', createdAt: subDays(now, 1) },
        ],
      },
    },
  });

  // Invoice 3: 2 Days Ago – Huda Market – Gel Extensions + Nail Art
  const inv3Sub = 3200 + 1800;
  const inv3Tax = (inv3Sub * 18) / 100;
  const inv3Total = inv3Sub + inv3Tax;

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'LXS1003',
      customerId: cust4.id,
      branchId: branch1.id,
      subtotal: inv3Sub,
      taxAmount: inv3Tax,
      totalAmount: inv3Total,
      paidAmount: inv3Total,
      balanceAmount: 0,
      status: 'Paid',
      createdAt: subDays(now, 2),
      items: {
        create: [
          { type: 'service', serviceId: svcNailExtensions.id, name: svcNailExtensions.name, quantity: 1, unitPrice: 3200, taxRate: 18, taxAmount: (3200 * 18) / 100, totalPrice: 3200 * 1.18 },
          { type: 'service', serviceId: svcNailArt.id, name: svcNailArt.name, quantity: 1, unitPrice: 1800, taxRate: 18, taxAmount: (1800 * 18) / 100, totalPrice: 1800 * 1.18 },
        ],
      },
      payments: {
        create: { amount: inv3Total, method: 'Card', reference: 'HDFC-POS-CARD-9912', createdAt: subDays(now, 2) },
      },
    },
  });

  // Invoice 4: 3 Days Ago – Spaze Corporate Park – Brazilian Keratin (Partially Paid)
  const inv4Sub = 6500;
  const inv4Tax = (6500 * 18) / 100;
  const inv4Total = inv4Sub + inv4Tax;
  const inv4Paid = 5000;
  const inv4Bal = inv4Total - inv4Paid;

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'LXS1004',
      customerId: cust2.id,
      branchId: branch2.id,
      subtotal: inv4Sub,
      taxAmount: inv4Tax,
      totalAmount: inv4Total,
      paidAmount: inv4Paid,
      balanceAmount: inv4Bal,
      status: 'PartiallyPaid',
      notes: 'Customer paid ₹5,000 via UPI; remaining ₹2,670 to be settled next visit.',
      createdAt: subDays(now, 3),
      items: {
        create: { type: 'service', serviceId: svcKeratin.id, name: svcKeratin.name, quantity: 1, unitPrice: 6500, taxRate: 18, taxAmount: inv4Tax, totalPrice: inv4Total },
      },
      payments: {
        create: { amount: inv4Paid, method: 'UPI', reference: 'GPAY-ADVANCE-3921', createdAt: subDays(now, 3) },
      },
    },
  });

  // Invoice 5: 4 Days Ago – Huda Market – Gel Manicure + Spa Pedicure
  const inv5Sub = 1200 + 1600;
  const inv5Tax = (inv5Sub * 18) / 100;
  const inv5Total = inv5Sub + inv5Tax;

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'LXS1005',
      customerId: cust1.id,
      branchId: branch1.id,
      subtotal: inv5Sub,
      taxAmount: inv5Tax,
      totalAmount: inv5Total,
      paidAmount: inv5Total,
      balanceAmount: 0,
      status: 'Paid',
      createdAt: subDays(now, 4),
      items: {
        create: [
          { type: 'service', serviceId: svcGelManicure.id, name: svcGelManicure.name, quantity: 1, unitPrice: 1200, taxRate: 18, taxAmount: (1200 * 18) / 100, totalPrice: 1200 * 1.18 },
          { type: 'service', serviceId: svcSpaPedicure.id, name: svcSpaPedicure.name, quantity: 1, unitPrice: 1600, taxRate: 18, taxAmount: (1600 * 18) / 100, totalPrice: 1600 * 1.18 },
        ],
      },
      payments: {
        create: { amount: inv5Total, method: 'Card', reference: 'ICICI-VISA-3011', createdAt: subDays(now, 4) },
      },
    },
  });

  // Invoice 6: 5 Days Ago – Spaze Corporate Park – Men's Haircut + Pomade
  const inv6Sub = 600 + 650;
  const inv6Tax = (inv6Sub * 18) / 100;
  const inv6Total = inv6Sub + inv6Tax;

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'LXS1006',
      customerId: cust3.id,
      branchId: branch2.id,
      subtotal: inv6Sub,
      taxAmount: inv6Tax,
      totalAmount: inv6Total,
      paidAmount: inv6Total,
      balanceAmount: 0,
      status: 'Paid',
      createdAt: subDays(now, 5),
      items: {
        create: [
          { type: 'service', serviceId: svcMensHaircut.id, name: svcMensHaircut.name, quantity: 1, unitPrice: 600, taxRate: 18, taxAmount: 108, totalPrice: 708 },
          { type: 'product', productId: prodSpray.id, name: prodSpray.name, quantity: 1, unitPrice: 650, taxRate: 18, taxAmount: 117, totalPrice: 767 },
        ],
      },
      payments: {
        create: { amount: inv6Total, method: 'UPI', reference: 'BHIM-UPI-90123', createdAt: subDays(now, 5) },
      },
    },
  });

  // Invoice 7: 6 Days Ago – Huda Market – Moroccan Hair Spa
  const inv7Sub = 1600;
  const inv7Tax = (1600 * 18) / 100;
  const inv7Total = inv7Sub + inv7Tax;

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'LXS1007',
      customerId: cust4.id,
      branchId: branch1.id,
      subtotal: inv7Sub,
      taxAmount: inv7Tax,
      totalAmount: inv7Total,
      paidAmount: inv7Total,
      balanceAmount: 0,
      status: 'Paid',
      createdAt: subDays(now, 6),
      items: {
        create: { type: 'service', serviceId: svcHairSpa.id, name: svcHairSpa.name, quantity: 1, unitPrice: 1600, taxRate: 18, taxAmount: inv7Tax, totalPrice: inv7Total },
      },
      payments: {
        create: { amount: inv7Total, method: 'Cash', reference: 'Cash Counter B', createdAt: subDays(now, 6) },
      },
    },
  });

  // ─── 10. Business Expenses ────────────────────────────────
  console.log('Recording realistic salon operating expenses...');

  const expCategories = [
    'Salon Space Rent',
    'Staff Payroll & Advances',
    'Utilities (Electricity & Water)',
    'Cosmetics & Product Restocking',
    'Laundry, Linens & Sanitization',
    'Local Ads & Digital Marketing',
    'Guest Refreshments (Espresso & Teas)',
    'Salon Maintenance & Equipment',
  ];

  const catMap: Record<string, string> = {};
  for (const c of expCategories) {
    const created = await prisma.expenseCategory.create({ data: { name: c } });
    catMap[c] = created.id;
  }

  const sampleExpenses = [
    { cat: 'Salon Space Rent', amount: 48000, desc: 'Monthly commercial lease - Indiranagar 100ft Rd', daysAgo: 10, method: 'NetBanking', vendor: 'Brigade Commercial Properties' },
    { cat: 'Staff Payroll & Advances', amount: 38500, desc: 'Bi-weekly stylist salary advances and incentives', daysAgo: 4, method: 'NetBanking', vendor: 'HDFC Direct Payroll' },
    { cat: 'Utilities (Electricity & Water)', amount: 7200, desc: 'Bescom commercial AC electricity bill', daysAgo: 6, method: 'UPI', vendor: 'Bescom Karnataka' },
    { cat: 'Cosmetics & Product Restocking', amount: 16800, desc: 'Restocked L’Oréal color tubes, bleach powder and developer', daysAgo: 8, method: 'Card', vendor: 'Beauty Wholesale India' },
    { cat: 'Laundry, Linens & Sanitization', amount: 3400, desc: 'Daily steamed white salon towels and cape dry-cleaning', daysAgo: 2, method: 'Cash', vendor: 'CleanFast Commercial Laundry' },
    { cat: 'Local Ads & Digital Marketing', amount: 5500, desc: 'Instagram Local Ads promotion for bridal balayage', daysAgo: 5, method: 'Card', vendor: 'Meta Ads India' },
    { cat: 'Guest Refreshments (Espresso & Teas)', amount: 2100, desc: 'Blue Tokai roast espresso beans, almond milk & green tea bags', daysAgo: 1, method: 'UPI', vendor: 'Nature’s Basket Indiranagar' },
    { cat: 'Salon Maintenance & Equipment', amount: 2800, desc: 'Dyson hair dryer filter service and hydraulic chair servicing', daysAgo: 7, method: 'Cash', vendor: 'ProSalon Repairs' },
    { cat: 'Cosmetics & Product Restocking', amount: 8400, desc: 'OPI gel nail lacquers and chrome powder pots restock', daysAgo: 3, method: 'UPI', vendor: 'OPI Distributors India' },
  ];

  for (const exp of sampleExpenses) {
    await prisma.expense.create({
      data: {
        categoryId: catMap[exp.cat],
        amount: exp.amount,
        description: exp.desc,
        expenseDate: subDays(now, exp.daysAgo),
        paymentMethod: exp.method,
        vendor: exp.vendor,
      },
    });
  }

  console.log('✅ COMPLETE SAMPLE DATA SEEDED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
