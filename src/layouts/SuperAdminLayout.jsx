/**
 * ArkCRM — SuperAdminLayout
 * ---------------------------------------------------------------------------
 * Shell for the platform administration surface, mounted under /admin/*.
 *
 * The authentication check and the SUPER_ADMIN role check both live in
 * ProtectedRoute (see routes/AppRoutes.jsx) so the policy is stated once. This
 * file only provides the shell: the admin navigation, which is intentionally a
 * different shape from the vendor nav (platform / revenue / governance) so a
 * platform operator never confuses a vendor's ledger with platform revenue.
 */

import AppLayout from './AppLayout';
import { superAdminNavigation } from '@/config/navigation.config';

export default function SuperAdminLayout() {
  return (
    <AppLayout
      navigation={superAdminNavigation}
      variant="admin"
      title="Platform"
      showFooter={false}
    />
  );
}
