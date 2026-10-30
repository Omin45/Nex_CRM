/**
 * NexERP — DashboardMockup Component
 * ---------------------------------------------------------------------------
 * A self-playing mock of the vendor dashboard: the bars breathe, the top edge
 * sweeps, and the KPI numbers drift in real time so the panel reads as live
 * data rather than a screenshot — it should behave like a looping video.
 *
 * The whole thing is decorative (`aria-hidden`), so the live numbers are pure
 * presentation. Under reduced motion the interval never starts and the numbers
 * hold their base values.
 */

import { useEffect, useState } from 'react';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import './DashboardMockup.css';

const NAV_ITEMS = [
  { label: 'Overview', active: true },
  { label: 'Pipeline' },
  { label: 'Customers' },
  { label: 'Inventory' },
  { label: 'Accounting' },
];

const BARS = 7;

/* Each figure wanders inside a band around a base so the panel feels live
   without the numbers running away. */
const KPI_DEFS = [
  { label: 'Revenue', base: 4.28, min: 3.9, max: 4.72, decimals: 2, prefix: '₦', suffix: 'M' },
  { label: 'Open Deals', base: 128, min: 116, max: 146, decimals: 0, prefix: '', suffix: '' },
  { label: 'Stock Alerts', base: 7, min: 3, max: 12, decimals: 0, prefix: '', suffix: '' },
];

/** How often the figures step, in ms. */
const TICK_MS = 1600;

const formatKpi = (def, value) =>
  `${def.prefix}${value.toFixed(def.decimals)}${def.suffix}`;

export default function DashboardMockup() {
  const reducedMotion = usePrefersReducedMotion();
  const [values, setValues] = useState(() => KPI_DEFS.map((def) => def.base));

  useEffect(() => {
    if (reducedMotion) return undefined;

    const id = setInterval(() => {
      setValues((prev) =>
        prev.map((value, index) => {
          const def = KPI_DEFS[index];
          const step = (def.max - def.min) * 0.18;
          const next = value + (Math.random() - 0.5) * step;
          return Math.min(def.max, Math.max(def.min, next));
        }),
      );
    }, TICK_MS);

    return () => clearInterval(id);
  }, [reducedMotion]);

  return (
    <div className="nx-mockup" aria-hidden="true">
      <div className="nx-mockup__frame">
        {/* window chrome */}
        <div className="nx-mockup__chrome">
          <span className="nx-mockup__dot" />
          <span className="nx-mockup__dot" />
          <span className="nx-mockup__dot" />
          <span className="nx-mockup__live">
            <span className="nx-mockup__live-dot" />
            Live
          </span>
        </div>

        <div className="nx-mockup__body">
          {/* sidebar */}
          <div className="nx-mockup__sidebar">
            {NAV_ITEMS.map((item) => (
              <span
                key={item.label}
                className={item.active ? 'nx-mockup__nav is-active' : 'nx-mockup__nav'}
              >
                {item.label}
              </span>
            ))}
          </div>

          {/* main */}
          <div className="nx-mockup__main">
            <div className="nx-mockup__kpis">
              {KPI_DEFS.map((kpi, index) => (
                <div key={kpi.label} className="nx-mockup__kpi">
                  <span className="nx-mockup__kpi-label">{kpi.label}</span>
                  <span className="nx-mockup__kpi-value">
                    {formatKpi(kpi, values[index])}
                  </span>
                </div>
              ))}
            </div>

            <div className="nx-mockup__chart">
              {Array.from({ length: BARS }, (_, index) => (
                <span key={index} className="nx-mockup__bar" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <span className="nx-mockup__highlight" />
    </div>
  );
}
