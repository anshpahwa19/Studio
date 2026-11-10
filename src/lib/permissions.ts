import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

/**
 * All module names used in the permission system.
 */
export const MODULES = {
  DASHBOARD: 'dashboard',
  APPOINTMENTS: 'appointments',
  CUSTOMERS: 'customers',
  STAFF: 'staff',
  SERVICES: 'services',
  BILLING: 'billing',
  INVENTORY: 'inventory',
  EXPENSES: 'expenses',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  USERS: 'users',
  ROLES: 'roles',
} as const;

/**
 * All action names used in the permission system.
 */
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
} as const;

export type ModuleName = (typeof MODULES)[keyof typeof MODULES];
export type ActionName = (typeof ACTIONS)[keyof typeof ACTIONS];

/**
 * Check if a user has a specific permission.
 * Permissions are stored as "module:action" strings.
 *
 * @param userPermissions - Array of permission strings (e.g., ["appointments:create", "appointments:read"])
 * @param module - The module to check (e.g., "appointments")
 * @param action - The action to check (e.g., "create")
 * @returns true if the user has the permission
 */
export function hasPermission(
  userPermissions: string[],
  module: string,
  action: string
): boolean {
  return userPermissions.includes(`${module}:${action}`);
}

/**
 * Check if the current session user has a specific permission.
 * Use this in server components or API routes.
 *
 * @param module - The module to check
 * @param action - The action to check
 * @returns Object with authorized flag and optional session user
 */
export async function requirePermission(
  module: string,
  action: string
): Promise<{
  authorized: boolean;
  user: { id: string; email: string; name: string; role: string; permissions: string[] } | null;
  error?: string;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      authorized: false,
      user: null,
      error: 'Authentication required',
    };
  }

  const user = session.user;

  // Admin role always has access
  if (user.role === 'Admin') {
    return { authorized: true, user };
  }

  if (!hasPermission(user.permissions, module, action)) {
    return {
      authorized: false,
      user,
      error: `You do not have permission to ${action} ${module}`,
    };
  }

  return { authorized: true, user };
}

/**
 * Build a permission string from module and action.
 */
export function buildPermissionKey(module: string, action: string): string {
  return `${module}:${action}`;
}

/**
 * Get all possible permission keys.
 */
export function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  for (const mod of Object.values(MODULES)) {
    for (const act of Object.values(ACTIONS)) {
      keys.push(buildPermissionKey(mod, act));
    }
  }
  return keys;
}
