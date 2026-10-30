/**
 * NexERP — ForbiddenPage
 * ---------------------------------------------------------------------------
 * The signed-in 403. NotFoundPage answers "there is nothing here"; this one
 * answers "there is something here, and you may not have it" — so the copy
 * names the resource and, when the router was told, the permission that was
 * missing.
 *
 * PermissionGate normally renders ForbiddenState inline. This page exists for
 * the case where navigation is blocked before any gate can run, or where a
 * user follows a link to a screen their role cannot open. The extra "back to
 * dashboard" button earns its place because a deep-linked visitor has no
 * sensible history to step back to.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import ForbiddenState from '@/components/feedback/ForbiddenState';
import { useAuth } from '@/hooks/useAuth';
import { useVendorHome } from '@/hooks/useVendorPath';
import { appRoutes } from '@/config/navigation.config';
import './ForbiddenPage.css';

export default function ForbiddenPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isPlatformAdmin, role } = useAuth();
  /* Tenant-scoped, so it is resolved from the session rather than read off the
     route table — the same reason NotFoundPage does it. */
  const vendorHome = useVendorHome();

  /* Whoever blocked the navigation can name the resource and the permission it
     wanted; a refresh drops that state, so both fall back to wording that is
     still true without them. */
  const resource = location.state?.resource ?? 'this page';
  const permission = location.state?.permission ?? null;

  const home = isAuthenticated
    ? isPlatformAdmin
      ? appRoutes.admin.index
      : vendorHome
    : appRoutes.login;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Access</span>
          <h1 className="page__title">Forbidden</h1>
          <p className="page__subtitle">
            This screen exists and your session is valid — your role simply does not include it.
            Nothing was deleted, and nothing you did broke it.
          </p>
        </div>
      </div>

      <div className="page__body nx-forbidden-page">
        {/* Diagnostics stay on the component's own default: DEV-only, and only
            when a permission was actually passed in. */}
        <ForbiddenState resource={resource} permission={permission} role={role} />

        <Button
          variant="outline"
          leftIcon={<FiHome size={15} />}
          onClick={() => navigate(home, { replace: true })}
        >
          {isAuthenticated ? 'Back to dashboard' : 'Go to sign in'}
        </Button>
      </div>
    </div>
  );
}
