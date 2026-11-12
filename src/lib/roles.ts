// Who can open and change each part of the app. Checked on every page and every save.

export const ROLES = ['Owner', 'Manager', 'Receptionist', 'Stylist'] as const;
export type Role = (typeof ROLES)[number];

export type Area =
  | 'dashboard' | 'appointments' | 'billing' | 'customers' | 'services'
  | 'staff' | 'attendance' | 'inventory' | 'suppliers' | 'expenses' | 'reports' | 'settings';

const VIEW: Record<Area, Role[]> = {
  dashboard: ['Owner', 'Manager', 'Receptionist', 'Stylist'],
  appointments: ['Owner', 'Manager', 'Receptionist', 'Stylist'],
  customers: ['Owner', 'Manager', 'Receptionist', 'Stylist'],
  billing: ['Owner', 'Manager', 'Receptionist'],
  services: ['Owner', 'Manager', 'Receptionist'],
  staff: ['Owner', 'Manager'],
  attendance: ['Owner', 'Manager', 'Receptionist'],
  inventory: ['Owner', 'Manager', 'Receptionist'],
  suppliers: ['Owner', 'Manager'],
  expenses: ['Owner', 'Manager'],
  reports: ['Owner', 'Manager'],
  settings: ['Owner'],
};

const EDIT: Record<Area, Role[]> = {
  ...VIEW,
  customers: ['Owner', 'Manager', 'Receptionist'],
  services: ['Owner', 'Manager'],
};

export const canView = (role: string, area: Area) => VIEW[area].includes(role as Role);
export const canEdit = (role: string, area: Area) => EDIT[area].includes(role as Role);
/** Voiding invoices and deleting records are limited to senior roles. */
export const isSenior = (role: string) => role === 'Owner' || role === 'Manager';
