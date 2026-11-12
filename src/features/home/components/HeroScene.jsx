/**
 * ArkCRM — HeroScene
 * ---------------------------------------------------------------------------
 * The hero's floating ERP field: glass panels carrying ERP icons (invoice,
 * stock, reports, payments, customers, projects) are scattered across the
 * entire hero at different depths, so the whole section reads as a living
 * system rather than a single screenshot.
 *
 * A branded background video can be layered in with `VITE_HERO_VIDEO_URL`
 * (set it in `.env`); when it is not set the field sits on a CSS film gradient
 * instead, which keeps the hero self-contained in a fresh clone. The video is
 * muted + looped + playsInline so it autoplays without a user gesture, and it
 * is skipped entirely under reduced motion.
 *
 * Decorative by contract: `aria-hidden`, `pointer-events: none`, sits at
 * z-index 0 — under the hero copy (z-index 1) but over the comet backdrop.
 */

import {
  FiFileText,
  FiPackage,
  FiBarChart2,
  FiCreditCard,
  FiUsers,
  FiFolder,
} from 'react-icons/fi';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import './HeroScene.css';

const HERO_VIDEO_SRC = import.meta.env.VITE_HERO_VIDEO_URL || '';

const PANELS = [
  { key: 'invoice', icon: <FiFileText />, label: 'Invoices' },
  { key: 'receipt', icon: <FiFileText />, label: 'Receipts' },
  { key: 'stock', icon: <FiPackage />, label: 'Stock' },
  { key: 'purchases', icon: <FiPackage />, label: 'Purchases' },
  { key: 'reports', icon: <FiBarChart2 />, label: 'Reports' },
  { key: 'payments', icon: <FiCreditCard />, label: 'Payments' },
  { key: 'customers', icon: <FiUsers />, label: 'Customers' },
  { key: 'projects', icon: <FiFolder />, label: 'Projects' },
];

export default function HeroScene() {
  const reducedMotion = usePrefersReducedMotion();
  const showVideo = Boolean(HERO_VIDEO_SRC) && !reducedMotion;

  return (
    <div className="nx-hero__scene" aria-hidden="true">
      {showVideo ? (
        <video
          className="nx-hero__scene-video"
          src={HERO_VIDEO_SRC}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
      ) : (
        <span className="nx-hero__scene-film" />
      )}

      <div className="nx-hero__scene-stage">
        {PANELS.map((panel) => (
          <span
            key={panel.key}
            className={`nx-hero__scene-card nx-hero__scene-card--${panel.key}`}
          >
            <span className="nx-hero__scene-icon">{panel.icon}</span>
            <span className="nx-hero__scene-label">{panel.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
