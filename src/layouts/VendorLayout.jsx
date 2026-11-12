/**
 * ArkCRM — VendorLayout
 * ---------------------------------------------------------------------------
 * Shell for the tenant (vendor) workspace, mounted under /vendor/:vendorId/*.
 *
 * Authentication and the platform-admin bounce are handled once, by
 * ProtectedRoute in the route tree — duplicating them here would mean two
 * places to change when the rules do. What stays here is the shell itself: the
 * sidebar rail, topbar and outlet, with the vendor navigation.
 *
 * It also cross-checks the :vendorId in the URL against the id in the session.
 * The API scopes every query with an X-Vendor-Id header taken from the session,
 * so a hand-edited URL would otherwise render one vendor's chrome around
 * another vendor's (empty) data — confusing at best, and a leak signal at
 * worst. Mismatched ids are redirected to the real workspace.
 */

import { Navigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import AppLayout from './AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useTenant } from '@/hooks/useTenant';
import {
  appRoutes,
  resolveVendorNavigation,
  vendorPath,
} from '@/config/navigation.config';
import ForbiddenState from '@/components/feedback/ForbiddenState';

export default function VendorLayout() {
  const { vendorId: routeVendorId } = useParams();
  const { vendorId: sessionVendorId, tenantName } = useTenant();
  const { isPlatformAdmin, role } = useAuth();
  const { permissions } = usePermissions();

  /* Session still has no tenant id (edge: bootstrap raced a permission-only
     session). Fall back to whatever the URL claims. */
  const activeVendorId = sessionVendorId ?? routeVendorId;

  /* The static nav model holds bare suffixes; resolve them to real
     /vendor/:vendorId hrefs once here so every shell consumer — links, active
     detection, breadcrumbs — works from absolute paths. */
  const navigation = useMemo(
    () => resolveVendorNavigation(activeVendorId),
    [activeVendorId],
  );

  /* A platform admin has no tenant books, so the vendor shell is not theirs —
     the router guard sends them to /admin; this closes the first frame. */
  if (isPlatformAdmin) return <Navigate to={appRoutes.admin.index} replace />;

  if (sessionVendorId && routeVendorId && sessionVendorId !== routeVendorId) {
    return <Navigate to={vendorPath(sessionVendorId, appRoutes.vendor.dashboard)} replace />;
  }

  if (!permissions.length) {
    return (
      <ForbiddenState
        resource="this workspace"
        permission="Any role with at least one permission"
        role={role}
      />
    );
  }

  return (
    <AppLayout navigation={navigation} variant="vendor" title={tenantName} />
  );
}
