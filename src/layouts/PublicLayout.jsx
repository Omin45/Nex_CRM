/**
 * ArkCRM — PublicLayout
 * ---------------------------------------------------------------------------
 * Shell for every marketing page: the floating SiteHeader, the page outlet and
 * the SiteFooter, over the fixed animated mesh.
 *
 * The mesh lives here (not in global.css) because it should be *behind the
 * marketing chrome only*. The vendor app draws its own backdrop inside
 * AppLayout, and a second mesh behind the app shell would double the blur cost
 * and muddy the sidebar.
 *
 * `main` is id="main" so the header's skip link has a real target.
 */

import { Suspense } from 'react';
import { Outlet, useNavigation } from 'react-router-dom';
import SiteHeader from '@/components/navigation/SiteHeader';
import SiteFooter from '@/components/navigation/SiteFooter';
import PageTransition from '@/components/navigation/PageTransition';
import ScrollToTop from '@/routes/ScrollToTop';
import LoadingState from '@/components/feedback/LoadingState';
import ErrorBoundary from '@/components/feedback/ErrorBoundary';
import './PublicLayout.css';

export default function PublicLayout() {
  const navigation = useNavigation();

  return (
    <div className="nx-public">
      {/* THE ANIMATED BACKGROUND MESH
          Fixed so the page scrolls over it rather than dragging it, and marked
          aria-hidden because it carries no information. The slow 24–36s drift
          keyframes live in global.css. */}
      <div className="nx-public__mesh" aria-hidden="true">
        <div className="nx-mesh">
          <span className="nx-mesh__orb" />
          <span className="nx-mesh__grid" />
        </div>
      </div>

      <SiteHeader />

      <ScrollToTop />

      {/* `nx-home` scopes the marketing layout scale — the section padding and
          the shared 1200px container. It lives on the shell, not on HomePage,
          because the inner marketing pages and the shared PageHeader use the
          same .nx-home__container. */}
      <main
        id="main"
        className="nx-public__main nx-home"
        aria-busy={navigation.state !== 'idle'}
      >
        <ErrorBoundary>
          {/* A route transition can leave a lazy chunk in flight; the fallback
              is a centred spinner rather than an empty page. */}
          <Suspense fallback={<LoadingState label="Loading page" size="lg" />}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </main>

      <SiteFooter />
    </div>
  );
}
