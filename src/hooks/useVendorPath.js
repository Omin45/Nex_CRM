/**
 * NexERP — useVendorPath
 * ---------------------------------------------------------------------------
 * Resolves an `appRoutes.vendor` suffix into a real href for the active tenant.
 *
 * The vendor workspace is mounted at /vendor/:vendorId and the id lives in the
 * session, not in a static config, so every link needs it threaded through. This
 * hook hides that: components ask for a path and get back a full href.
 *
 *   const vendorPath = useVendorPath();
 *   <Link to={vendorPath(appRoutes.vendor.sales.leads)}>Leads</Link>
 *
 * If the session has no tenant yet, the id falls back to the user's vendorId
 * and finally to a literal placeholder, so a link is never `undefined` during
 * the window between boot and session restore.
 */

import { useCallback, useMemo } from 'react';
import { appRoutes, vendorPath as resolve } from '@/config/navigation.config';
import { useTenant } from '@/hooks/useTenant';

export default function useVendorPath() {
  const { vendorId } = useTenant();

  return useCallback((suffix) => resolve(vendorId, suffix), [vendorId]);
}

/**
 * The signed-in user's home, and the redirect target for a platform admin who
 * lands in the vendor shell. Exposed as a hook so a redirect and the sidebar
 * can never disagree about the dashboard URL.
 */
export function useVendorHome() {
  const { vendorId } = useTenant();
  return useMemo(() => resolve(vendorId, appRoutes.vendor.dashboard), [vendorId]);
}
