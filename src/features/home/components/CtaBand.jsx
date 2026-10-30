/**
 * NexERP — CtaBand
 * ---------------------------------------------------------------------------
 * Spec: "a final CTA band with a gradient border, the line 'Ready to run your
 * business on NexERP?' and two buttons — 'Start free' and 'Talk to sales' —
 * sitting above the footer."
 *
 * The "gradient border" is a two-layer technique: a gradient-filled parent with
 * a small padding, and an opaque inner panel inset by 1px. That produces a true
 * gradient hairline — a plain `border-image` cannot be given a border-radius.
 */

import { FiArrowRight, FiMessageCircle } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Reveal from '@/components/marketing/Reveal';
import SectionGlow from '@/components/marketing/SectionGlow';
import { appRoutes } from '@/config/navigation.config';
import './CtaBand.css';

export default function CtaBand() {
  return (
    <section className="nx-cta" aria-labelledby="nx-cta-heading">
      <SectionGlow tone="indigo" />
      <div className="nx-home__container">
        <Reveal step={1} distance={28}>
          <div className="nx-cta__frame">
            <div className="nx-cta__inner">
              <h2 className="nx-cta__heading nx-heading-fx" id="nx-cta-heading">
                Ready to run your business on NexERP?
              </h2>

              <p className="nx-cta__text">
                Set up your workspace in an afternoon, or talk to us about a
                migration plan for a business your size.
              </p>

              <div className="nx-cta__actions">
                <Button
                  to={appRoutes.register}
                  variant="primary"
                  size="lg"
                  rightIcon={<FiArrowRight size={18} aria-hidden="true" />}
                >
                  Start free
                </Button>

                <Button
                  to={appRoutes.contact}
                  variant="secondary"
                  size="lg"
                  leftIcon={<FiMessageCircle size={17} aria-hidden="true" />}
                >
                  Talk to sales
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
