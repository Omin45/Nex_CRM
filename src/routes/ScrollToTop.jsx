/**
 * ArkCRM — ScrollToTop
 * ---------------------------------------------------------------------------
 * Spec: "scroll-to-top on route change".
 *
 * Mounted once near the root of the tree. Without it, navigating from the
 * bottom of a long page to a short one leaves the reader stranded mid-document
 * with an apparently blank screen.
 *
 * Two details that matter:
 *   - It respects `useNavigation()`: during a lazy route transition the
 *     navigation is still in flight and the scroll happens on commit, so the
 *     new page does not render at the old offset.
 *   - The "instant" flag is used, so the jump is not smoothed — an animated
 *     scroll on a page change feels broken, not polished.
 *
 * A `path`/`search` hash fragment, when present, is scrolled into view instead,
 * which is what makes /features#modules work from the footer.
 */

import { useEffect } from 'react';
import { useLocation, useNavigation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  const navigation = useNavigation();

  useEffect(() => {
    if (navigation.state !== 'idle') return;

    if (hash) {
      /* Let the target paint before measuring it. */
      const id = hash.slice(1);
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search, hash, navigation.state]);

  return null;
}
