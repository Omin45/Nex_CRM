/**
 * NexERP — useScrollReveal
 * ---------------------------------------------------------------------------
 * Spec: "sections fade up as they enter the viewport (IntersectionObserver
 * hook)".
 *
 * Returns a ref to attach to the element and an `isVisible` flag. The element
 * starts hidden (CSS owns the hidden state) and reveals once, on entry.
 *
 * Notes:
 *   - `once` defaults to true: a section that has already been seen should not
 *     disappear again when the user scrolls back up.
 *   - `threshold` of 0.15 means roughly a sixth of the element must be on
 *     screen, which avoids a tall section revealing when only its first pixel
 *     crosses the fold.
 *   - If IntersectionObserver is unavailable the element is revealed
 *     immediately, so content is never trapped in the hidden state.
 *   - `unobserve` after reveal disconnects the observer outright; there is no
 *     reason to keep watching.
 */

import { useEffect, useRef, useState } from 'react';

const SUPPORTED = typeof IntersectionObserver !== 'undefined';

export default function useScrollReveal({ threshold = 0.15, once = true, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(!SUPPORTED);

  useEffect(() => {
    if (!SUPPORTED) {
      setIsVisible(true);
      return undefined;
    }

    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin]);

  return { ref, isVisible };
}
