/**
 * NexERP — PageTransition
 * ---------------------------------------------------------------------------
 * Spec: "page transitions: a subtle fade/slide between routes".
 *
 * Keyed on the pathname so React remounts the subtree per route, which
 * re-triggers the CSS animation. The animation is opacity plus a 8px rise —
 * anything larger reads as a slideshow on a page the user is navigating
 * deliberately.
 *
 * The children are not remounted by a key alone in a real app (that would
 * discard state), so the wrapper is deliberately dumb: it renders whatever the
 * route produced, once.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

export default function PageTransition({ children }) {
  const location = useLocation();
  const ref = useRef(null);

  /* Restart the animation imperatively. Relying on a `key` would remount the
     subtree and throw away scroll position and any local state the page had. */
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.classList.remove('is-entering');
    /* Forcing a reflow is what makes the subsequent add() a new animation
       rather than a no-op on the same computed style. */
    void node.offsetWidth;
    node.classList.add('is-entering');
  }, [location.pathname]);

  return (
    <div ref={ref} className="nx-page-transition">
      {children}
    </div>
  );
}
