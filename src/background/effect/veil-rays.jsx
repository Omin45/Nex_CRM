/**
 * ArkCRM — VeilRays
 * ---------------------------------------------------------------------------
 * A section backdrop of soft light rays fanning down from the top edge behind
 * a translucent veil. Each ray sways on its own slow loop, so the band looks
 * lit from above rather than tinted.
 *
 * Decorative by contract: `aria-hidden`, `pointer-events: none`, and a
 * negative z-index so it paints above the host section's background but below
 * its text. The host section must establish a stacking context (position +
 * z-index) — the marketing sections already do.
 *
 * Motion is neutralised by the global `prefers-reduced-motion` rule in
 * styles/global.css.
 */

import './veil-rays.css';

export default function VeilRays() {
  return (
    <div className="veil-rays" aria-hidden="true">
      <span className="veil-rays__veil" />
      <span className="veil-rays__ray veil-rays__ray--1" />
      <span className="veil-rays__ray veil-rays__ray--2" />
      <span className="veil-rays__ray veil-rays__ray--3" />
      <span className="veil-rays__ray veil-rays__ray--4" />
      <span className="veil-rays__ray veil-rays__ray--5" />
      <span className="veil-rays__glow" />
    </div>
  );
}
