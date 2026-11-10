// ─── Session & Auth Types ──────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

// ─── API Response Types ────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ─── Customer Types ────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | string | null;
  address?: string | null;
  notes?: string | null;
  hairPreferences?: string | null;
  nailPreferences?: string | null;
  treatmentHistory?: string | null;
  preferredStaffId?: string | null;
  isActive: boolean;
  totalSpent: number;
  visitCount: number;
  lastVisitAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  preferredStaff?: Staff | null;
}

// ─── Staff Types ───────────────────────────────────────────────────

export interface Staff {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  role: string;
  specializations?: string | null;
  avatar?: string | null;
  commissionRate: number;
  isActive: boolean;
  joinDate: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StaffAvailability {
  id: string;
  staffId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOff: boolean;
}

export interface StaffLeave {
  id: string;
  staffId: string;
  startDate: Date | string;
  endDate: Date | string;
  reason?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: Date | string;
}

// ─── Service Types ─────────────────────────────────────────────────

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  services?: Service[];
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  price: number;
  duration: number;
  taxSettingId?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: ServiceCategory;
  taxSetting?: TaxSetting | null;
}

// ─── Appointment Types ─────────────────────────────────────────────

export type AppointmentStatus =
  | 'Confirmed'
  | 'CheckedIn'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'
  | 'NoShow';

export interface Appointment {
  id: string;
  customerId: string;
  staffId: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  totalDuration: number;
  status: AppointmentStatus;
  notes?: string | null;
  isWalkIn: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  customer?: Customer;
  staff?: Staff;
  services?: AppointmentService[];
  invoice?: Invoice | null;
}

export interface AppointmentService {
  id: string;
  appointmentId: string;
  serviceId: string;
  staffId?: string | null;
  price: number;
  duration: number;
  service?: Service;
  staff?: Staff | null;
}

// ─── Product & Inventory Types ─────────────────────────────────────

export interface ProductCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  products?: Product[];
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  sku?: string | null;
  barcode?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStockLevel: number;
  unit: string;
  isActive: boolean;
  supplierId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: ProductCategory;
  supplier?: Supplier | null;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string | null;
  referenceId?: string | null;
  createdAt: Date | string;
  product?: Product;
}

// ─── Invoice & Payment Types ───────────────────────────────────────

export type InvoiceStatus =
  | 'Unpaid'
  | 'PartiallyPaid'
  | 'Paid'
  | 'Cancelled'
  | 'Refunded';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Other';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  appointmentId?: string | null;
  subtotal: number;
  discountType?: string | null;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  customer?: Customer;
  appointment?: Appointment | null;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  type: 'service' | 'product';
  serviceId?: string | null;
  productId?: string | null;
  taxSettingId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  createdAt: Date | string;
  service?: Service | null;
  product?: Product | null;
  taxSetting?: TaxSetting | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  isAdvance: boolean;
  createdAt: Date | string;
  invoice?: Invoice;
}

// ─── Expense Types ─────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Expense {
  id: string;
  categoryId: string;
  amount: number;
  description?: string | null;
  expenseDate: Date | string;
  paymentMethod: string;
  vendor?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: ExpenseCategory;
}

// ─── Settings Types ────────────────────────────────────────────────

export interface SalonSettings {
  id: string;
  name: string;
  logo?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  gstin?: string | null;
  panNumber?: string | null;
  currency: string;
  currencySymbol: string;
  timeZone: string;
  openTime: string;
  closeTime: string;
  slotDuration: number;
  invoicePrefix: string;
  invoiceNextNum: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  taxSettings?: TaxSetting[];
}

export interface TaxSetting {
  id: string;
  name: string;
  rate: number;
  isActive: boolean;
  isDefault: boolean;
  salonSettingsId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─── Audit Log Types ───────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  module: string;
  recordId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
  user?: { id: string; name: string; email: string } | null;
}

// ─── Role & Permission Types ───────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  permissions?: RolePermission[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string | null;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  granted: boolean;
  permission?: Permission;
}

// ─── Dashboard Types ───────────────────────────────────────────────

export interface DashboardStats {
  todayRevenue: number;
  todayAppointments: number;
  totalCustomers: number;
  pendingInvoices: number;
  revenueChange: number;
  appointmentChange: number;
  customerChange: number;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
}

export interface ServiceDistribution {
  name: string;
  value: number;
  color: string;
}

// ─── Select Option Type ────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}
