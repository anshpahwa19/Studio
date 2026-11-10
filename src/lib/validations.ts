import { z } from 'zod';

// ─── Authentication ────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Customers ─────────────────────────────────────────────────────

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dateOfBirth: z.string().optional().or(z.literal('')),
  address: z.string().max(500, 'Address must be less than 500 characters').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
  hairPreferences: z
    .string()
    .max(500, 'Hair preferences must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  nailPreferences: z
    .string()
    .max(500, 'Nail preferences must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  preferredStaffId: z.string().optional().or(z.literal('')),
});

export type CustomerInput = z.infer<typeof customerSchema>;

// ─── Appointments ──────────────────────────────────────────────────

export const appointmentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  staffId: z.string().min(1, 'Staff member is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  services: z
    .array(
      z.object({
        serviceId: z.string().min(1, 'Service is required'),
        staffId: z.string().optional(),
        price: z.number().min(0, 'Price must be non-negative'),
        duration: z.number().min(1, 'Duration must be at least 1 minute'),
      })
    )
    .min(1, 'At least one service is required'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
  isWalkIn: z.boolean().default(false),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

// ─── Services ──────────────────────────────────────────────────────

export const serviceSchema = z.object({
  name: z
    .string()
    .min(1, 'Service name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().min(1, 'Category is required'),
  price: z
    .number({ invalid_type_error: 'Price is required' })
    .min(0, 'Price must be non-negative'),
  duration: z
    .number({ invalid_type_error: 'Duration is required' })
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration must be less than 8 hours'),
  taxSettingId: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

// ─── Service Categories ────────────────────────────────────────────

export const serviceCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ServiceCategoryInput = z.infer<typeof serviceCategorySchema>;

// ─── Staff ─────────────────────────────────────────────────────────

export const staffSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  role: z
    .string()
    .min(1, 'Role is required')
    .max(50, 'Role must be less than 50 characters'),
  commissionRate: z
    .number({ invalid_type_error: 'Commission rate is required' })
    .min(0, 'Commission rate must be non-negative')
    .max(100, 'Commission rate cannot exceed 100%')
    .default(0),
  specializations: z
    .array(z.string())
    .optional()
    .default([]),
  joinDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type StaffInput = z.infer<typeof staffSchema>;

// ─── Products ──────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Name must be less than 200 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().min(1, 'Category is required'),
  sku: z
    .string()
    .max(50, 'SKU must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  barcode: z
    .string()
    .max(50, 'Barcode must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  purchasePrice: z
    .number({ invalid_type_error: 'Purchase price is required' })
    .min(0, 'Purchase price must be non-negative')
    .default(0),
  sellingPrice: z
    .number({ invalid_type_error: 'Selling price is required' })
    .min(0, 'Selling price must be non-negative'),
  stock: z
    .number({ invalid_type_error: 'Stock quantity is required' })
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .default(0),
  minStockLevel: z
    .number({ invalid_type_error: 'Minimum stock level is required' })
    .int('Minimum stock level must be a whole number')
    .min(0, 'Minimum stock level cannot be negative')
    .default(5),
  unit: z.string().default('pcs'),
  supplierId: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;

// ─── Invoices ──────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  type: z.enum(['service', 'product'], { required_error: 'Item type is required' }),
  serviceId: z.string().optional().or(z.literal('')),
  productId: z.string().optional().or(z.literal('')),
  taxSettingId: z.string().optional().or(z.literal('')),
  name: z.string().min(1, 'Item name is required'),
  quantity: z
    .number({ invalid_type_error: 'Quantity is required' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .default(1),
  unitPrice: z
    .number({ invalid_type_error: 'Unit price is required' })
    .min(0, 'Unit price must be non-negative'),
  taxRate: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  totalPrice: z.number().min(0),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  appointmentId: z.string().optional().or(z.literal('')),
  items: z
    .array(invoiceItemSchema)
    .min(1, 'At least one item is required'),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0, 'Discount must be non-negative').default(0),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

// ─── Payments ──────────────────────────────────────────────────────

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z
    .number({ invalid_type_error: 'Amount is required' })
    .min(0.01, 'Amount must be greater than zero'),
  method: z.enum(['Cash', 'UPI', 'Card', 'Other'], {
    required_error: 'Payment method is required',
  }),
  reference: z
    .string()
    .max(100, 'Reference must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().or(z.literal('')),
  isAdvance: z.boolean().default(false),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// ─── Expenses ──────────────────────────────────────────────────────

export const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z
    .number({ invalid_type_error: 'Amount is required' })
    .min(0.01, 'Amount must be greater than zero'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  expenseDate: z.string().min(1, 'Expense date is required'),
  paymentMethod: z.enum(['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other']).default('Cash'),
  vendor: z
    .string()
    .max(200, 'Vendor name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().or(z.literal('')),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

// ─── Settings ──────────────────────────────────────────────────────

export const settingsSchema = z.object({
  name: z
    .string()
    .min(1, 'Salon name is required')
    .max(200, 'Name must be less than 200 characters'),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  zipCode: z.string().max(10).optional().or(z.literal('')),
  country: z.string().max(100).default('India'),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.literal('')),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
    .optional()
    .or(z.literal('')),
  currency: z.string().default('INR'),
  currencySymbol: z.string().default('₹'),
  timeZone: z.string().default('Asia/Kolkata'),
  openTime: z.string().default('09:00'),
  closeTime: z.string().default('21:00'),
  slotDuration: z
    .number()
    .int()
    .min(5, 'Slot duration must be at least 5 minutes')
    .max(120, 'Slot duration must be less than 120 minutes')
    .default(30),
  invoicePrefix: z.string().max(10).default('INV'),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
