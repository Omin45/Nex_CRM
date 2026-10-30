/**
 * NexERP — usePermissions
 * ---------------------------------------------------------------------------
 * Granular RBAC checks for rendering. Every action button in the app is gated
 * through this hook (or <PermissionGate>) rather than by scattered role
 * comparisons, so a role change in permissions.config.js updates the whole UI
 * at once.
 *
 * The backend still enforces the same matrix — this only decides visibility.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  PERMISSIONS, ROLE_PERMISSIONS, ROLES, getPermissionsForRole, roleHasPermission,
} from '@/config/permissions.config';
import { selectUserRole } from '@/features/auth/slices/authSlice';

/** Super admins implicitly hold every permission. */
function resolvePermissions(role) {
  if (!role) return [];
  if (role === ROLES.SUPER_ADMIN) return Object.values(PERMISSIONS);
  return getPermissionsForRole(role);
}

export function usePermissions() {
  const role = useSelector(selectUserRole);
  const permissions = useMemo(() => resolvePermissions(role), [role]);

  const set = useMemo(() => new Set(permissions), [permissions]);

  /**
   * Can the current user perform this action?
   * Accepts a single permission or a list; a list requires only one of them,
   * so a "view or export" control is a single call.
   */
  const can = useMemo(() => {
    const check = (...required) => {
      if (!required.length) return true;
      const flattened = required.flat().filter(Boolean);
      if (!flattened.length) return true;
      return flattened.some((permission) => set.has(permission));
    };
    /* canAll() is attached as a property so both call styles work. */
    check.all = (...required) => required.flat().filter(Boolean).every((p) => set.has(p));
    return check;
  }, [set]);

  /** Convenience wrapper: can(permissions.INVOICE_CREATE). */
  const check = useMemo(
    () => (permission) => set.has(permission),
    [set],
  );

  return {
    role,
    permissions,
    set,
    can,
    canAll: can.all,
    check,
    isPlatformAdmin: role === ROLES.SUPER_ADMIN,
    /** True when the role appears in the given list — for display logic. */
    hasRole: (...roles) => roles.includes(role),
  };
}

/** Standalone predicate for use outside a component (e.g. route definitions). */
export { roleHasPermission, ROLE_PERMISSIONS };

export default usePermissions;
