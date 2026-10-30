/**
 * NexERP — useScrollLock
 * ---------------------------------------------------------------------------
 * Freezes background scrolling while a full-screen overlay is open (the mobile
 * menu, a modal). Without this, scrolling behind an open menu drags the page
 * underneath it on iOS.
 *
 * The scrollbar width is compensated with padding so the page behind does not
 * shift sideways when the scrollbar disappears, and the previous value is
 * always restored — including when the component unmounts while still locked.
 */

import { useEffect } from 'react';

export default function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    /* window.innerWidth includes the scrollbar; the difference is its width. */
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [locked]);
}
