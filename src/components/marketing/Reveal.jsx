/**
 * ArkCRM — Reveal
 * ---------------------------------------------------------------------------
 * Thin wrapper around `useScrollReveal` so a page can write
 *
 *   <Reveal><Section /></Reveal>
 *
 * instead of wiring a ref and a className at every call site. The hidden and
 * visible states live in Reveal.css; the hook only reports when the element
 * crossed the fold.
 *
 * `step` staggers siblings, which is how the auth brand panel reveals its three
 * bullets one after another. It takes a small integer rather than a duration so
 * no inline `style` attribute is needed (the spec forbids them): the integer
 * becomes a `data-step`, and the delays are declared in Reveal.css.
 *
 * `from` decides which edge the element travels in from — `up` (default),
 * `down`, `left` or `right` — so neighbouring bands can approach from opposite
 * sides and the page reads as choreography instead of one uniform fade-up.
 * `distance` is an optional magnitude in pixels; it is bucketed into
 * sm/md/lg so the value can be expressed as a data attribute rather than an
 * inline custom property.
 */

import useScrollReveal from '@/hooks/useScrollReveal';
import './Reveal.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Buckets a pixel distance into one of the three stylesheet magnitudes. */
function distanceBucket(distance) {
  if (distance == null) return undefined;
  if (distance <= 20) return 'sm';
  if (distance <= 34) return 'md';
  return 'lg';
}

export default function Reveal({
  children,
  as: Tag = 'div',
  step = 0,
  from = 'up',
  distance,
  className = '',
  ...rest
}) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <Tag
      ref={ref}
      className={cx('nx-reveal', isVisible && 'is-visible', className)}
      data-step={step || undefined}
      data-from={from}
      data-distance={distanceBucket(distance)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
