/** Null permissions on a user means these role defaults. A saved list replaces them. */

export const PERMISSIONS = [
  'invoices.view',
  'invoices.create',
  'invoices.approve',
  'payments.view',
  'payments.export',
  'wallets.view',
  'wallets.simulate',
  'fees.manage',
  'users.manage',
  'audit.view',
  'audit.export',
  'integrations.manage',
  'documents.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

export const ROLE_DEFAULTS: Record<string, Permission[]> = {
  admin: ALL,
  spv: ['invoices.view', 'payments.view', 'payments.export', 'wallets.view', 'wallets.simulate', 'audit.view', 'audit.export', 'users.manage', 'documents.view'],
  buyer: ['invoices.view', 'invoices.create', 'invoices.approve', 'payments.view', 'payments.export', 'wallets.view', 'wallets.simulate', 'users.manage', 'documents.view'],
  supplier: ['invoices.view', 'invoices.create', 'invoices.approve', 'payments.view', 'wallets.view', 'wallets.simulate', 'users.manage', 'documents.view'],
};

export function effectivePermissions(role: string, custom: string[] | null | undefined): Permission[] {
  if (custom && custom.length) {
    return custom.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p));
  }
  return ROLE_DEFAULTS[role] || ['invoices.view', 'documents.view'];
}

export function hasPermission(role: string, custom: string[] | null | undefined, permission: Permission): boolean {
  if (role === 'admin' && !(custom && custom.length)) return true;
  return effectivePermissions(role, custom).includes(permission);
}
