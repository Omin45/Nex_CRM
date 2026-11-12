/**
 * ArkCRM — HeroSection Component
 * Integrated with Comet Cascade background effect and custom CRM typography.
 */

import { FiArrowRight, FiPlay, FiShield, FiZap, FiRefreshCw } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Reveal from '@/components/marketing/Reveal';
import DashboardMockup from './DashboardMockup';
import HeroHeadline from './HeroHeadline';
import HeroScene from './HeroScene';
import CometCascade from '@/background/effect/comet-cascade';
import { appRoutes } from '@/config/navigation.config';
import './HeroSection.css';

const TRUST_POINTS = [
  { icon: <FiShield />, label: 'SOC 2 aligned' },
  { icon: <FiZap />, label: '99.9% uptime SLA' },
  { icon: <FiRefreshCw />, label: 'Daily backups' },
];

export default function HeroSection() {
  return (
    <section className="nx-hero" aria-labelledby="nx-hero-heading">
      {/* Comet Cascade background effect placed behind the landing hero */}
      <div className="nx-hero__comet-layer" aria-hidden="true">
        <CometCascade />
      </div>

      {/* Floating ERP field spread across the whole hero */}
      <HeroScene />

      <div className="nx-home__container">
        {/* Badge */}
        <Reveal className="nx-hero__badge-row" step={1}>
          <span className="nx-hero__badge">
            <span className="nx-hero__badge-dot" aria-hidden="true" />
            Trusted by 500+ businesses
          </span>
        </Reveal>

        {/* Headline — fixed writeup; only its first word rotates */}
        <Reveal as="h1" step={2} className="nx-hero__heading" id="nx-hero-heading">
          <HeroHeadline />
        </Reveal>

        {/* Sub-headline */}
        <Reveal as="p" step={3} className="nx-hero__sub">
          ArkCRM brings multi-tenant CRM, inventory, accounting, and operations into one high-performance workspace — engineered with real-time audit reliability.
        </Reveal>

        {/* Calls to action */}
        <Reveal step={4} className="nx-hero__actions">
          <Button
            to={appRoutes.register}
            variant="primary"
            size="lg"
            className="nx-hero__cta-primary"
            rightIcon={<FiArrowRight size={18} aria-hidden="true" />}
          >
            Get Started
          </Button>

          <Button
            to={appRoutes.features}
            variant="ghost"
            size="lg"
            className="nx-hero__cta-secondary"
          >
            <span className="nx-hero__play" aria-hidden="true">
              <FiPlay size={12} fill="currentColor" />
            </span>
            See how it works
          </Button>
        </Reveal>

        {/* Trust row */}
        <Reveal step={5} className="nx-hero__trust">
          <ul className="nx-hero__trust-list">
            {TRUST_POINTS.map((point) => (
              <li key={point.label} className="nx-hero__trust-item">
                <span className="nx-hero__trust-icon" aria-hidden="true">
                  {point.icon}
                </span>
                {point.label}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Product mockup */}
        <Reveal step={6} from="up" className="nx-hero__mockup" distance={40}>
          <DashboardMockup />
        </Reveal>
      </div>
    </section>
  );
}