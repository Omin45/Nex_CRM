/**
 * NexERP — VelvetSweep
 * ---------------------------------------------------------------------------
 * A section backdrop of broad, plush gradient bands crossing on opposing
 * diagonals — the "velvet" of a heavy satin sweep. Richer and more directional
 * than the shared SectionGlow, for a band that should feel layered.
 *
 * Decorative by contract: `aria-hidden`, `pointer-events: none`, negative
 * z-index. The host section must already establish a stacking context.
 *
 * Motion is neutralised by the global `prefers-reduced-motion` rule in
 * styles/global.css.
 */

import './velvet-sweep.css';

export default function VelvetSweep() {
  return (
    <div className="velvet-sweep" aria-hidden="true">
      <span className="velvet-sweep__band velvet-sweep__band--a" />
      <span className="velvet-sweep__band velvet-sweep__band--b" />
      <span className="velvet-sweep__band velvet-sweep__band--c" />
      <span className="velvet-sweep__sheen" />
    </div>
  );
}
