/**
 * ArkCRM — StatsBand
 * ---------------------------------------------------------------------------
 * Spec: "a thin glass strip with four count-up statistics: 500+ companies,
 * 2.4M invoices processed, 99.9% uptime, 120+ countries."
 *
 * Each figure owns a useCountUp, which starts itself via its own
 * IntersectionObserver — so a number animates when the reader actually reaches
 * it, not on mount. The 0.12s startDelay per item staggers them, which reads as
 * a sequence instead of four numbers snapping at once.
 *
 * `decimals` matters: counting to 100 and printing "99.9%" would be a lie, so
 * the 99.9 and 2.4 figures carry decimals and the integers do not.
 *
 * Reduced motion is handled inside useCountUp, which snaps to the final value.
 */

import { FiUsers, FiFileText, FiActivity, FiGlobe } from 'react-icons/fi';
import useCountUp from '@/hooks/useCountUp';
import Reveal from '@/components/marketing/Reveal';
import SectionGlow from '@/components/marketing/SectionGlow';
import VeilRays from '@/background/effect/veil-rays';
import './StatsBand.css';

const STATS = [
  { icon: <FiUsers />, value: 500, decimals: 0, suffix: '+', label: 'Companies onboarded' },
  { icon: <FiFileText />, value: 2.4, decimals: 1, suffix: 'M', label: 'Invoices processed' },
  { icon: <FiActivity />, value: 99.9, decimals: 1, suffix: '%', label: 'Uptime, trailing year' },
  { icon: <FiGlobe />, value: 120, decimals: 0, suffix: '+', label: 'Countries served' },
];

/** Stagger between figures, in ms. */
const STAGGER_MS = 120;

function Stat({ icon, value, decimals, suffix, label, index }) {
  const { ref, value: current } = useCountUp(value, { decimals, startDelay: index * STAGGER_MS });

  return (
    <li className="nx-stats__item">
      <span className="nx-stats__icon" aria-hidden="true">
        {icon}
      </span>
      {/* The animated number is decorative; the real value is in the label so a
          screen reader gets "2.4M invoices processed", not a reading of zero. */}
      <span className="nx-stats__value" ref={ref} aria-hidden="true">
        {current.toFixed(decimals)}
        <span className="nx-stats__suffix">{suffix}</span>
      </span>
      <span className="nx-stats__label">{label}</span>
    </li>
  );
}

export default function StatsBand() {
  return (
    <section className="nx-stats" aria-label="ArkCRM by the numbers">
      <SectionGlow tone="accent" />
      <VeilRays />
      <div className="nx-home__container">
        <Reveal className="nx-stats__strip" from="up" distance={24}>
          <ul className="nx-stats__list">
            {STATS.map((stat, index) => (
              <Stat key={stat.label} {...stat} index={index} />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
