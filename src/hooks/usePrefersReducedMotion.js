/**
 * ArkCRM — usePrefersReducedMotion
 * ---------------------------------------------------------------------------
 * Tracks the `prefers-reduced-motion: reduce` media query.
 *
 * The CSS layer already neutralises decorative animation globally (see the
 * reduced-motion block at the bottom of global.css). This hook exists for the
 * cases CSS cannot cover: JavaScript that drives a typewriter, a carousel
 * autoplay timer or a count-up. Those must *stop doing work*, not merely stop
 * being animated, or a screen-reader user still gets a machine talking at them.
 *
 * Reads the initial value synchronously on mount so the first render is
 * already correct (no flash of animated content), then follows changes.
 */

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function getInitialPreference() {
  /* matchMedia is optional-chained: an old engine or a non-browser environment
     (the SSR render smoke test) is treated as "no preference". */
  return globalThis.matchMedia?.(QUERY)?.matches ?? false;
}

export default function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(getInitialPreference);

  useEffect(() => {
    const query = globalThis.matchMedia?.(QUERY);
    if (!query) return undefined;

    const handleChange = (event) => setPrefersReduced(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return prefersReduced;
}
