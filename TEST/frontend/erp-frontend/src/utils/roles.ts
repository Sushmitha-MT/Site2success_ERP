// ── RBAC Role Utilities ───────────────────────────────────────────────────────
// Single source of truth for role-based access checks used across the frontend.

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'project_manager'
  | 'employee'
  | 'founder'
  | 'co_founder';

/** Roles allowed to access financial data */
export const FINANCE_ROLES = ['super_admin', 'admin', 'founder', 'co_founder'] as const;

/** Admin and Manager-level roles that can manage projects and tasks */
export const isAdminOrManager = (role?: string): boolean =>
  ['super_admin', 'admin', 'manager', 'project_manager'].includes(role ?? '');

/** Roles that have access to the Finance module */
export const isFinanceRole = (role?: string): boolean =>
  FINANCE_ROLES.includes((role?.toLowerCase() ?? '') as any);

/** Roles that can create/edit/delete tasks */
export const canManageTasks = (role?: string): boolean =>
  ['super_admin', 'admin', 'manager', 'project_manager'].includes(role ?? '');

/** Only super_admin and admin can hard-delete records */
export const canDeleteItems = (role?: string): boolean =>
  ['super_admin', 'admin'].includes(role ?? '');

/** Non-employee roles that can see team-level data */
export const isTeamLead = (role?: string): boolean =>
  ['super_admin', 'admin', 'manager', 'project_manager', 'founder', 'co_founder'].includes(
    role ?? ''
  );

/** Format a role string for display (e.g. 'project_manager' → 'Project Manager') */
export const formatRole = (role?: string): string =>
  (role ?? 'unknown')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
