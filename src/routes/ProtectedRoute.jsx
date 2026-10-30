/**
 * NexERP — ProtectedRoute
 * ---------------------------------------------------------------------------
 * Auth gate for the vendor and platform shells.
 *
 * Responsibilities, in order:
 *   1. Wait for the session to be restored. Redirecting before that is what
 *      causes the login -> dashboard -> login bounce on a hard refresh.
 *   2. Send an anonymous visitor to /login, remembering where they were so the
 *      auth page can return them there after signing in.
 *   3. Enforce the role split: `requirePlatformAdmin` marks the /admin tree,
 *      and anyone whose admin/vendor status does not match is redirected to the
 *      shell they *do* have. The two shells have different data scopes, so
 *      quietly showing a super admin an empty vendor dashboard is worse than a
 *      redirect.
 *
 * Renders `null` while deciding, which is deliberate — it prevents a flash of
 * the wrong shell. It relies on SessionBootstrap having mounted above it.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVendorHome } from '@/hooks/useVendorPath';
import { appRoutes } from '@/config/navigation.config';

export default function ProtectedRoute({ children, requirePlatformAdmin = false }) {
  const { isAuthenticated, isPlatformAdmin, isBootstrapping } = useAuth();
  const location = useLocation();
  const vendorHome = useVendorHome();

  if (isBootstrapping) return null;

  if (!isAuthenticated) {
    return (
      <Navigate
        to={appRoutes.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  /* A platform admin has no tenant books, so the vendor workspace is not
     something to show them — and a vendor must never reach the admin tree. */
  if (isPlatformAdmin !== requirePlatformAdmin) {
    return <Navigate to={isPlatformAdmin ? appRoutes.admin.index : vendorHome} replace />;
  }

  return children;
}
