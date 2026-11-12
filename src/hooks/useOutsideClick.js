/**
 * ArkCRM — useOutsideClick
 * ---------------------------------------------------------------------------
 * Closes a floating surface when the user clicks or focuses outside it.
 * Shared by the sidebar (mobile drawer), the navbar dropdowns, the filter
 * menus and the chart popovers, so the dismissal semantics are identical.
 *
 * @param {Function} handler called when a dismissal-worthy event fires
 * @param {Ref|Ref[]} [refs] element(s) considered "inside"
 * @param {boolean} [enabled=true] pass false to suspend the listener
 */

import { useEffect } from 'react';

function toArray(refs) {
  if (!refs) return [];
  return Array.isArray(refs) ? refs : [refs];
}

export function useOutsideClick(handler, refs, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const isInside = (target) =>
      toArray(refs).some((ref) => ref?.current?.contains?.(target));

    const onPointerDown = (event) => {
      if (isInside(event.target)) return;
      handler(event);
    };

    /* Tabbing out of the surface should dismiss it too, so keyboard users are
       not trapped inside a menu they cannot see. */
    const onFocusIn = (event) => {
      if (isInside(event.target)) return;
      handler(event);
    };

    /* `pointerdown` fires before `click`, so the surface closes before the
       click lands on whatever is underneath. */
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handler, enabled, ...toArray(refs)]);
}

/** Fires a callback on Escape while `enabled`. */
export function useEscapeKey(handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') handler(event);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handler, enabled]);
}

export default useOutsideClick;
