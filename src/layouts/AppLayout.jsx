/**
 * ArkCRM — AppLayout
 * ---------------------------------------------------------------------------
 * The signed-in chrome. Renders the sidebar rail, the topbar and an <Outlet/>
 * for the current page, and owns the one piece of shell state that has to live
 * above both the sidebar and the topbar: whether the mobile drawer is open.
 *
 * VendorLayout and SuperAdminLayout wrap this with their own nav model and
 * role guard, so anything shell-level (drawer behaviour, page transition, the
 * "skip to content" link) is implemented exactly once.
 */

import { useCallback, useEffect, useState } from 'react';
import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import Topbar from '@/components/navigation/Topbar';
import Footer from '@/components/navigation/Footer';
import ErrorBoundary from '@/components/feedback/ErrorBoundary';
import ScrollToTop from '@/routes/ScrollToTop';
import LoadingState from '@/components/feedback/LoadingState';
import { useAuth } from '@/hooks/useAuth';
import '@/components/navigation/Layout.css';

/**
 * @param {Array}  navigation  a NAVIGATION constant from navigation.config
 * @param {'vendor'|'admin'} variant
 * @param {boolean} [showFooter=true]
 * @param {React.ComponentType} [Toolbar] optional header controls slot
 */
export default function AppLayout({
  navigation,
  variant = 'vendor',
  title,
  showFooter = true,
  flushContent = false,
  Toolbar = null,
}) {
  const location = useLocation();
  const { isBootstrapping } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  /* Close the drawer on navigation — the Sidebar also does this, but doing it
     here means a page reached by a keyboard shortcut closes it too. */
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  /* Reset scroll to the top of the new page; without this a user who scrolls
     deep in a long table keeps that offset on the next route. */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (isBootstrapping) {
    /* Restoring the session is async, so the shell waits rather than flashing
       a signed-out chrome for a frame. */
    return (
      <div className="nx-shell">
        <LoadingState title="Restoring your session" label="One moment…" size="lg" />
      </div>
    );
  }

  return (
    <div className="nx-shell" data-variant={variant}>
      <a href="#nx-main" className="sr-only">
        Skip to content
      </a>

      <Sidebar
        groups={navigation}
        variant={variant}
        isOpen={drawerOpen}
        onClose={closeDrawer}
      />

      <div className="nx-shell__main">
        <Topbar onOpenSidebar={openDrawer} title={title}>
          {Toolbar ? <Toolbar /> : null}
        </Topbar>

        <main
          id="nx-main"
          className={flushContent ? 'nx-shell__content nx-shell__content--flush' : 'nx-shell__content'}
          /* Announce the page change to screen readers on route change. */
          key={location.pathname}
        >
          {/* A crash in one page must not take down the whole shell. */}
          <ErrorBoundary>
            {/* Every screen is a lazy chunk, so the outlet needs a boundary or
                a slow route renders nothing at all. */}
            <Suspense fallback={<LoadingState label="Loading page" size="lg" />}>
              <ScrollToTop />
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        {showFooter ? <Footer /> : null}
      </div>
    </div>
  );
}
