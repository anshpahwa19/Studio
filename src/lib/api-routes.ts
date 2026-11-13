import 'server-only';
import * as customers from '@/app/(app)/customers/service';
import * as appointments from '@/app/(app)/appointments/service';
import * as attendance from '@/app/(app)/attendance/service';
import * as billing from '@/app/(app)/billing/service';
import * as expenses from '@/app/(app)/expenses/service';
import * as inventory from '@/app/(app)/inventory/service';
import * as services from '@/app/(app)/services/service';
import * as settings from '@/app/(app)/settings/service';
import * as staff from '@/app/(app)/staff/service';
import * as suppliers from '@/app/(app)/suppliers/service';
import * as supplierBills from '@/app/(app)/suppliers/[id]/service';
import * as reads from './api-reads';
import { GET as customerExport } from '@/app/(app)/customers/export/route';
import { GET as reportExport } from '@/app/(app)/reports/export/route';
import { GET as billFile } from '@/app/(app)/suppliers/bill-file/[id]/route';
import type { NextRequest } from 'next/server';
import { attempt, type Result } from './action';
import { login, logout } from './auth';

/** What a route handler gets: URL parameters, ?query values, the JSON body (or {}), and the form when the upload is multipart. */
type Ctx = { p: Record<string, string>; q: URLSearchParams; b: any; form: FormData | null; req: Request };
/** Most routes answer with a Result; file downloads (CSV, bill photos) answer with a Response. */
type Handler = (c: Ctx) => Promise<Result<any> | Response>;

const routes: { method: string; parts: string[]; run: Handler }[] = [];
const route = (method: string, path: string, run: Handler) => routes.push({ method, parts: path.split('/').filter(Boolean), run });

// Sign in / out
route('POST', '/auth/login', ({ b }) => attempt(() => login(String(b.email ?? ''), String(b.password ?? ''))));
route('POST', '/auth/logout', () => attempt(async () => logout()));

// Clients
route('POST', '/customers', ({ b }) => customers.saveCustomer(b));
route('PUT', '/customers/:id', ({ p, b }) => customers.saveCustomer({ ...b, id: p.id }));
route('DELETE', '/customers/:id', ({ p }) => customers.archiveCustomer(p.id));
route('POST', '/customers/import', ({ b }) => customers.importCustomers(String(b.csv ?? '')));

// Appointments
route('POST', '/appointments', ({ b }) => appointments.bookAppointment(b));
route('PUT', '/appointments/:id', ({ p, b }) => appointments.rescheduleAppointment({ ...b, id: p.id }));
route('POST', '/appointments/:id/status', ({ p, b }) => appointments.setAppointmentStatus(p.id, String(b.status ?? '')));

// Attendance
route('POST', '/attendance/punch-in', ({ b }) => attendance.punchIn(b));
route('POST', '/attendance/punch-out', ({ b }) => attendance.punchOut(b));
route('PUT', '/attendance', ({ b }) => attendance.saveTimes(b));

// Bills
route('POST', '/invoices', ({ b }) => billing.createInvoice(b));
route('POST', '/invoices/:id/payments', ({ p, b }) => billing.addPayment(p.id, b));
route('POST', '/invoices/:id/cancel', ({ p, b }) => billing.cancelInvoice(p.id, String(b.reason ?? ''), b.refundMethod ?? null));
route('POST', '/invoices/:id/refunds', ({ p, b }) => billing.refundInvoice(p.id, b));

// Expenses
route('POST', '/expenses', ({ b }) => expenses.saveExpense(b));
route('PUT', '/expenses/:id', ({ p, b }) => expenses.saveExpense({ ...b, id: p.id }));
route('DELETE', '/expenses/:id', ({ p }) => expenses.deleteExpense(p.id));

// Stock
route('POST', '/products', ({ b }) => inventory.saveProduct(b));
route('PUT', '/products/:id', ({ p, b }) => inventory.saveProduct({ ...b, id: p.id }));
route('POST', '/products/:id/archive', ({ p }) => inventory.archiveProduct(p.id));
route('DELETE', '/products/:id', ({ p }) => inventory.deleteProduct(p.id));
route('GET', '/products/:id/history', ({ p }) => inventory.stockHistory(p.id));
route('POST', '/stock/movements', ({ b }) => inventory.moveStock(b));
route('POST', '/stock/transfers', ({ b }) => inventory.transferStock(b));

// Services
route('POST', '/services', ({ b }) => services.saveService(b));
route('PUT', '/services/:id', ({ p, b }) => services.saveService({ ...b, id: p.id }));
route('POST', '/services/:id/archive', ({ p }) => services.archiveService(p.id));
route('POST', '/services/:id/restore', ({ p }) => services.restoreService(p.id));
route('POST', '/service-categories', ({ b }) => services.addCategory(String(b.name ?? '')));

// Staff
route('POST', '/staff', ({ b }) => staff.saveStaff(b));
route('PUT', '/staff/:id', ({ p, b }) => staff.saveStaff({ ...b, id: p.id }));
route('POST', '/staff/:id/archive', ({ p }) => staff.archiveStaff(p.id));
route('POST', '/staff/:id/restore', ({ p }) => staff.restoreStaff(p.id));

// Suppliers, their bills and payments
route('POST', '/suppliers', ({ b }) => suppliers.saveSupplier(b));
route('PUT', '/suppliers/:id', ({ p, b }) => suppliers.saveSupplier({ ...b, id: p.id }));
route('POST', '/suppliers/:id/active', ({ p, b }) => suppliers.setSupplierActive(p.id, b.active === true));
route('POST', '/supplier-bills', ({ b, form }) => supplierBills.saveBill(form ?? toForm(b)));
route('PUT', '/supplier-bills/:id', ({ p, b, form }) => supplierBills.saveBill(withId(form ?? toForm(b), p.id)));
route('DELETE', '/supplier-bills/:id', ({ p }) => supplierBills.deleteBill(p.id));
route('POST', '/supplier-payments', ({ b }) => supplierBills.addPayment(b));
route('DELETE', '/supplier-payments/:id', ({ p }) => supplierBills.deletePayment(p.id));

// Settings, branches, logins
route('PUT', '/settings', ({ b }) => settings.saveSettings(b));
route('POST', '/branches', ({ b }) => settings.saveBranch(b));
route('PUT', '/branches/:id', ({ p, b }) => settings.saveBranch({ ...b, id: p.id }));
route('DELETE', '/branches/:id', ({ p }) => settings.deleteBranch(p.id));
route('POST', '/users', ({ b }) => settings.saveUser(b));
route('PUT', '/users/:id', ({ p, b }) => settings.saveUser({ ...b, id: p.id }));
route('DELETE', '/users/:id', ({ p }) => settings.deleteUser(p.id));
route('POST', '/me/password', ({ b }) => settings.changeMyPassword(String(b.current ?? ''), String(b.next ?? '')));

// ---- Reads (GET). Lists take ?q= and filters; see the README. Static paths come before /:id. ----
route('GET', '/me', () => reads.me());
route('GET', '/dashboard', () => reads.dashboard());
route('GET', '/reports', ({ q }) => reads.report(q));
route('GET', '/reports/export', ({ req }) => reportExport(req as NextRequest));
route('GET', '/customers', ({ q }) => reads.listCustomers(q));
route('GET', '/customers/export', ({ req }) => customerExport(req as NextRequest));
route('GET', '/customers/:id', ({ p }) => reads.getCustomer(p.id));
route('GET', '/appointments', ({ q }) => reads.listAppointments(q));
route('GET', '/appointments/:id', ({ p }) => reads.getAppointment(p.id));
route('GET', '/attendance', ({ q }) => reads.listAttendance(q));
route('GET', '/invoices', ({ q }) => reads.listInvoices(q));
route('GET', '/invoices/:id', ({ p }) => reads.getInvoice(p.id));
route('GET', '/products', ({ q }) => reads.listProducts(q));
route('GET', '/products/:id', ({ p }) => reads.getProduct(p.id));
route('GET', '/stock/monthly', ({ q }) => reads.monthlyStock(q));
route('GET', '/stock/movements', ({ q }) => reads.listStockMovements(q));
route('GET', '/services', ({ q }) => reads.listServices(q));
route('GET', '/services/:id', ({ p }) => reads.getService(p.id));
route('GET', '/staff', ({ q }) => reads.listStaff(q));
route('GET', '/staff/:id', ({ p }) => reads.getStaff(p.id));
route('GET', '/suppliers', () => reads.listSuppliers());
route('GET', '/suppliers/:id', ({ p }) => reads.getSupplier(p.id));
route('GET', '/supplier-bills/:id/file', ({ p, req }) => billFile(req, { params: { id: p.id } }));
route('GET', '/expenses', ({ q }) => reads.listExpenses(q));
route('GET', '/expenses/categories', () => reads.expenseCategories());
route('GET', '/expenses/:id', ({ p }) => reads.getExpense(p.id));
route('GET', '/branches', () => reads.listBranches());
route('GET', '/branches/:id', ({ p }) => reads.getBranch(p.id));
route('GET', '/settings', () => reads.getSettings());
route('GET', '/users', () => reads.listUsers());
route('GET', '/users/:id', ({ p }) => reads.getUser(p.id));

function toForm(b: Record<string, unknown>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(b ?? {})) if (v !== undefined && v !== null) f.set(k, String(v));
  return f;
}
function withId(f: FormData, id: string) {
  f.set('id', id);
  return f;
}

/** Finds the route for this method and path. A known path with the wrong method gives 405. */
export function match(method: string, segments: string[]): { run: Handler; p: Record<string, string> } | 'method' | null {
  let pathHit = false;
  for (const r of routes) {
    if (r.parts.length !== segments.length) continue;
    const p: Record<string, string> = {};
    if (!r.parts.every((part, i) => (part.startsWith(':') ? ((p[part.slice(1)] = decodeURIComponent(segments[i])), true) : part === segments[i]))) continue;
    pathHit = true;
    if (r.method === method) return { run: r.run, p };
  }
  return pathHit ? 'method' : null;
}
