/**
 * ArkCRM — DashBackdrop
 * ---------------------------------------------------------------------------
 * The executive dashboard's depth layer: one perspective stage holding a
 * tilted grid plane that drifts under the KPI strip, plus two soft palette
 * glows. It exists so the screen has a horizon rather than a flat wall, and
 * it borrows the site header's trick — real `perspective` on the stage, the
 * plane genuinely in 3D — but darker, slower and dimmer, because here it
 * sits behind numbers an operator has to read.
 *
 * Pure atmosphere: aria-hidden, inert to the pointer, painted at z-index -1
 * inside the .nx-dash stacking context, capped at 0.5 opacity. Its frozen
 * frame under reduced motion is a designed pose, not a stalled one.
 */

import './DashBackdrop.css';

export default function DashBackdrop() {
  return (
    <div className="nx-dash-backdrop" aria-hidden="true">
      <div className="nx-dash-backdrop__stage">
        <div className="nx-dash-backdrop__grid" />
        <div className="nx-dash-backdrop__glow nx-dash-backdrop__glow--lead" />
        <div className="nx-dash-backdrop__glow nx-dash-backdrop__glow--trail" />
      </div>
      <div className="nx-dash-backdrop__scrim" />
    </div>
  );
}
