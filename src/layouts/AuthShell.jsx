/**
 * NexERP — AuthShell
 * ---------------------------------------------------------------------------
 * The two-column auth shell. Spec: "The left column (brand panel) is always
 * visible and contains the large per-letter animated 'NexERP' logo, the
 * description, the TypeWriter line, 3 short feature bullets that fade in one
 * after another, and floating blurred orbs in the background. The right column
 * is a glass card with the form."
 *
 * The brand panel is deliberately a sibling of the <Outlet/>, not a parent: a
 * login -> register swap re-renders only the right column, so the animated logo
 * and the typewriter never restart and never flash. Every auth screen — login,
 * register, forgot password, reset password, verify email — mounts here, so the
 * two-column frame is stated once.
 */

import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import AnimatedLogo from '@/components/brand/AnimatedLogo';
import TypeWriter from '@/components/marketing/TypeWriter';
import Reveal from '@/components/marketing/Reveal';
import ScrollToTop from '@/routes/ScrollToTop';
import LoadingState from '@/components/feedback/LoadingState';
import { FiArrowLeft, FiLayers, FiShield, FiZap } from 'react-icons/fi';
import './AuthShell.css';

/** Rotating words, per the spec's list. */
const ROTATING_WORDS = ['Sales', 'Inventory', 'Accounting', 'HR', 'Projects'];

const BULLETS = [
  { icon: <FiLayers />, text: 'Eight modules on one shared ledger — no more re-keying numbers.' },
  { icon: <FiZap />, text: 'Live inventory, pipeline and cash positions as they happen.' },
  { icon: <FiShield />, text: 'Per-action permissions and full audit history on every record.' },
];

export default function AuthShell() {
  return (
    <div className="nx-auth">
      <ScrollToTop />

      <div className="nx-auth__mesh" aria-hidden="true">
        <div className="nx-mesh">
          <span className="nx-mesh__orb" />
          <span className="nx-mesh__grid" />
        </div>
        {/* Blurred orbs sitting behind the brand panel only. */}
        <span className="nx-auth__orb nx-auth__orb--one" />
        <span className="nx-auth__orb nx-auth__orb--two" />
      </div>

      {/* ---- left: brand panel ---- */}
      <section className="nx-auth__brand" aria-label="About NexERP">
        <div className="nx-auth__brand-inner">
          <Link to="/" className="nx-auth__logo-link" aria-label="NexERP home">
            <AnimatedLogo size="lg" />
          </Link>

          <p className="nx-auth__description">
            The all-in-one ERP for modern multi-vendor businesses — running your
            daily operations, from the first quote to the final ledger entry.
          </p>

          <p className="nx-auth__tagline">
            Manage your business{' '}
            <TypeWriter words={ROTATING_WORDS} className="nx-auth__typewriter" />
          </p>

          {/* Staggered: step 1, 2, 3 reveal in sequence. */}
          <ul className="nx-auth__bullets">
            {BULLETS.map((bullet, index) => (
              <Reveal as="li" key={bullet.text} step={index + 1} className="nx-auth__bullet">
                <span className="nx-auth__bullet-icon" aria-hidden="true">
                  {bullet.icon}
                </span>
                {bullet.text}
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- right: the form column ---- */}
      <section className="nx-auth__panel">
        <div className="nx-auth__card">
          <Link to="/" className="nx-auth__back">
            <FiArrowLeft size={14} aria-hidden="true" />
            Back to site
          </Link>

          {/* A route swap can leave a lazy auth chunk in flight; the fallback
              is a compact spinner inside the card, never an empty pane. */}
          <Suspense fallback={<LoadingState label="Loading form" variant="card" />}>
            <Outlet />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
