/**
 * NexERP — useCountUp
 * ---------------------------------------------------------------------------
 * Spec: "stats strip with count-up numbers".
 *
 * Eases a number from 0 to `target` once the element scrolls into view, so the
 * stat animates when the reader arrives at it rather than on page load.
 *
 * Uses requestAnimationFrame rather than setInterval so the easing stays
 * smooth and a backgrounded tab does not queue thousands of frames.
 *
 * Reduced motion snaps straight to the final value — a number that lands
 * instantly is the accessible behaviour; a number that races up is not.
 *
 * @example
 * const { ref, value } = useCountUp(12400, { decimals: 0, suffix: '+' });
 * <strong ref={ref}>{value.toLocaleString()}{suffix}</strong>
 */

import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';

const DURATION_MS = 1800;
const SUPPORTED = typeof IntersectionObserver !== 'undefined';

/** easeOutExpo: fast start, long settle. Reads as "counting up" then landing. */
function ease(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function useCountUp(target, options = {}) {
  const { decimals = 0, duration = DURATION_MS, startDelay = 0 } = options;

  const ref = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(reducedMotion ? target : 0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      setValue(target);
      return undefined;
    }

    if (!SUPPORTED) {
      setValue(target);
      return undefined;
    }

    const node = ref.current;
    if (!node) return undefined;

    let frame;
    let startTime;

    const run = () => {
      /* Guard against a second start if the observer fires more than once. */
      if (hasRun.current) return;
      hasRun.current = true;

      const step = (now) => {
        if (startTime === undefined) startTime = now;

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setValue(target * ease(progress));

        if (progress < 1) frame = requestAnimationFrame(step);
      };

      frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        if (startDelay) setTimeout(run, startDelay);
        else run();
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target, duration, startDelay, reducedMotion]);

  const rounded = Number(value).toFixed(decimals);
  return { ref, value: decimals > 0 ? Number(rounded) : Math.round(Number(rounded)), isDone: value === target };
}
