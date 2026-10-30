/**
 * NexERP — MistOrb
 * ---------------------------------------------------------------------------
 * A section backdrop of heavy, blurred orbs drifting through a low haze — a
 * slower, softer companion to the crisper VeilRays. Used where a band should
 * feel calm and spacious.
 *
 * Decorative by contract: `aria-hidden`, `pointer-events: none`, negative
 * z-index. The host section must already establish a stacking context.
 *
 * Motion is neutralised by the global `prefers-reduced-motion` rule in
 * styles/global.css.
 */

import './mist-orb.css';

export default function MistOrb() {
  return (
    <div className="mist-orb" aria-hidden="true">
      <span className="mist-orb__orb mist-orb__orb--a" />
      <span className="mist-orb__orb mist-orb__orb--b" />
      <span className="mist-orb__orb mist-orb__orb--c" />
      <span className="mist-orb__haze" />
    </div>
  );
}
