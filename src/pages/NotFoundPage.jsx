/**
 * ArkCRM — NotFoundPage
 * ---------------------------------------------------------------------------
 * The 404 screen. It has to work in two situations: inside a signed-in shell
 * (so it renders as a page body, keeping the sidebar) and outside one (so it
 * still offers a way back to the login screen).
 */

import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCompass, FiHome } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import EmptyState from '@/components/feedback/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useVendorHome } from '@/hooks/useVendorPath';
import { appRoutes } from '@/config/navigation.config';
import './NotFoundPage.css';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isPlatformAdmin } = useAuth();
  /* The workspace home is tenant-scoped, so it has to be resolved from the
     session rather than read straight off the route table. */
  const vendorHome = useVendorHome();

  const home = isAuthenticated
    ? isPlatformAdmin
      ? appRoutes.admin.index
      : vendorHome
    : appRoutes.login;

  return (
    <div className="page">
      <div className="page__body nx-notfound">
        <EmptyState
          icon={<FiCompass size={26} />}
          title="This page doesn't exist"
          description={`Nothing is mapped to this address. If you followed a link from inside ArkCRM, it may point at a screen that has moved.`}
          action={
            <Button leftIcon={<FiHome size={15} />} onClick={() => navigate(home, { replace: true })}>
              {isAuthenticated ? 'Back to dashboard' : 'Go to sign in'}
            </Button>
          }
          secondaryAction={
            <Button variant="ghost" leftIcon={<FiArrowLeft size={15} />} onClick={() => navigate(-1)}>
              Go back
            </Button>
          }
        >
          <p className="text-xs text-faint nx-notfound__tip">
            Tip: press <span className="nx-kbd">⌘K</span> to search across customers,
            invoices, products and projects.
          </p>
        </EmptyState>
      </div>
    </div>
  );
}
