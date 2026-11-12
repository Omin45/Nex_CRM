/**
 * ArkCRM — SharedShell
 * ---------------------------------------------------------------------------
 * Chrome for the four routes that belong to neither tenant nor platform:
 * /profile, /notifications, /activity and /help.
 *
 * They are absolute paths in the navigation model, so they cannot live under
 * the /vendor/:vendorId parent (that would change the href every time the
 * active tenant changed), and they must not be duplicated under /admin. One
 * shell that *picks* the right navigation model is therefore less code than
 * two route subtrees — and it keeps a single definition of "what the sidebar
 * looks like on a shared page".
 *
 * Rendering the platform sidebar for a SUPER_ADMIN here is deliberate: the
 * sidebar already filters by permission, so a tenant user on /profile sees
 * their own nav and an operator sees theirs.
 */

import AppLayout from './AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { resolveVendorNavigation, superAdminNavigation } from '@/config/navigation.config';

export default function SharedShell() {
  const { isPlatformAdmin } = useAuth();
  const { vendorId, tenantName } = useTenant();

  const navigation = isPlatformAdmin
    ? superAdminNavigation
    : resolveVendorNavigation(vendorId);

  return (
    <AppLayout
      navigation={navigation}
      variant={isPlatformAdmin ? 'admin' : 'vendor'}
      title={isPlatformAdmin ? 'Platform' : tenantName}
      showFooter={!isPlatformAdmin}
    />
  );
}
