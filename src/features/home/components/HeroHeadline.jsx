/**
 * ArkCRM — HeroHeadline
 * ---------------------------------------------------------------------------
 * The hero writeup is fixed:
 *
 *   Operate your business with clarity.
 *   Automate the busywork.
 *   Grow without limits.
 *
 * Only the FIRST word of the first line moves. It swaps through a short list
 * of leading verbs while every other word stays exactly as written, so the
 * writeup never changes — one word just animates in place.
 *
 * The rotating word sits in a same-cell grid slot sized to the longest word,
 * so swapping it never re-centres the centred headline (no layout jump). Only
 * the word is `key`-ed, so only the word replays its entrance animation; the
 * fixed text animates once on mount and then stays still.
 *
 * Reduced motion stops the cycle on the first word — the line always reads as
 * the complete, static writeup.
 */

import { useEffect, useState } from 'react';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import './HeroHeadline.css';

/** The verbs that take turns leading the first sentence. */
const WORDS = ['Operate', 'Control', 'Manage', 'Scale'];

/** The fixed first sentence after the rotating word. */
const TAIL = 'your business with clarity.';

/** The fixed second and third sentences — never change. */
const LINES = ['Automate the busywork.', 'Grow without limits.'];

/** How long a word holds before the next swaps in, in ms. */
const HOLD_MS = 2800;

export default function HeroHeadline() {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % WORDS.length);
    }, HOLD_MS);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const word = WORDS[index];
  /* The longest word reserves the slot width; it is invisible and only exists
     to stop the fixed tail from shifting as shorter words swap in. */
  const sizer = WORDS.reduce((longest, item) => (item.length > longest.length ? item : longest), '');

  return (
    <span className="nx-hero__phrase">
      <span className="nx-hero__line">
        <span className="nx-hero__lead-slot">
          <span className="nx-hero__lead-sizer" aria-hidden="true">
            {sizer}
          </span>
          {/* `key` on the word only: it remounts each cycle, replaying the rise. */}
          <span className="nx-hero__lead" key={index}>
            {word}
          </span>
        </span>{' '}
        <span className="nx-hero__tail">{TAIL}</span>
      </span>

      {LINES.map((line) => (
        <span key={line} className="nx-hero__line nx-hero__line--fixed">
          {line}
        </span>
      ))}
    </span>
  );
}
