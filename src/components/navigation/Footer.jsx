/**
 * NexERP — Footer
 * ---------------------------------------------------------------------------
 * Slim shell footer: build, environment and the links that matter on an
 * internal tool. Hidden automatically in print (see utility.css).
 *
 * @example
 * <Footer />
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import useVendorPath from '@/hooks/useVendorPath';
import { appRoutes } from '@/config/navigation.config';
import { ROLE_LABELS } from '@/config/permissions.config';
import './Layout.css';

const APP_VERSION = '1.0.0';

export default function Footer({ showEnvironment = true }) {
  const { tenant, isPlatformAdmin } = useAuth();
  const vendorPath = useVendorPath();

  /* Settings are tenant-scoped, so the href has to be resolved per shell: a
     platform admin has no workspace and lands on system health instead. */
  const settingsHref = isPlatformAdmin
    ? appRoutes.admin.system
    : vendorPath(appRoutes.vendor.settings.preferences);

  return (
    <footer className="nx-footer no-print">
      <div className="nx-footer__links">
        <span>© {new Date().getFullYear()} NexERP</span>
        <span className="nx-footer__version">v{APP_VERSION}</span>

        {showEnvironment ? (
          <span className="nx-footer__env">
            {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
          </span>
        ) : null}
      </div>

      <nav className="nx-footer__links" aria-label="Footer">
        {tenant?.name ? <span>Workspace: {tenant.name}</span> : null}
        <Link to={appRoutes.help} className="nx-footer__link">
          Help
        </Link>
        <Link to={settingsHref} className="nx-footer__link">
          Preferences
        </Link>
        <a
          className="nx-footer__link"
          href="https://github.com"
          target="_blank"
          rel="noreferrer noopener"
        >
          Status
        </a>
        <span title={ROLE_LABELS[tenant?.role] ?? ''}>Secure session</span>
      </nav>
    </footer>
  );
}
