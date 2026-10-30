/**
 * NexERP — useDebounce
 * ---------------------------------------------------------------------------
 * Search inputs fire a keystroke-rate of requests; this delays the expensive
 * work (a query dispatch, a filter recompute) until the user pauses.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @param {*} value the value to debounce
 * @param {number} [delay=300] quiet period in ms
 * @returns {*} the debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    /* Clearing on each change is what makes this a trailing-edge debounce. */
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Debounces a callback and returns a stable wrapper.
 *
 * The returned function also exposes `.cancel()` and `.flush()` so a form can
 * abandon a pending call (dialog closed) or force it through (Enter pressed).
 *
 * @param {Function} callback
 * @param {number} [delay=300]
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef(null);

  /* Latest callback without re-creating the wrapper. */
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      callbackRef.current(...(lastArgsRef.current ?? []));
    }
  }, []);

  const debounced = useCallback(
    (...args) => {
      lastArgsRef.current = args;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );

  /* Cancel any in-flight timer if the component unmounts. */
  useEffect(() => cancel, [cancel]);

  debounced.cancel = cancel;
  debounced.flush = flush;

  return debounced;
}

export default useDebounce;
