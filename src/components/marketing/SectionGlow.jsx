/**
 * ArkCRM — SectionGlow
 * ---------------------------------------------------------------------------
 * The animated light behind a marketing band. Two radial orbs drift on
 * independent loops while a thin sheen pans across, which keeps the page
 * reading as one living surface instead of a stack of static blocks — the
 * same motion language as the header's plane/sweep, dialled down so it never
 * competes with the copy.
 *
 * Decorative by contract: `aria-hidden`, `pointer-events: none`, and a
 * negative z-index so it paints above the host section's background but below
 * its text. That requires the host to establish a stacking context — the
 * seven hosts that mount this component are listed once at the bottom of the
 * stylesheet rather than repeating three rules in seven files.
 *
 * `tone` picks the two RGB channels from the design tokens, so the glow
 * follows a theme change for free (both themes redefine the rgb triplets).
 */

import './SectionGlow.css';

export default function SectionGlow({ tone = 'accent' }) {
  return (
    <div className="nx-sectionfx" data-tone={tone} aria-hidden="true">
      <span className="nx-sectionfx__orb nx-sectionfx__orb--a" />
      <span className="nx-sectionfx__orb nx-sectionfx__orb--b" />
      <span className="nx-sectionfx__sheen" />
    </div>
  );
}
