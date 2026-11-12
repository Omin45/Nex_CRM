/**
 * ArkCRM — Testimonials
 * ---------------------------------------------------------------------------
 * Spec: "3 customer testimonials that cross-fade every 6 seconds, each in a
 * glass card with an avatar (initials in a gradient circle), name, role and
 * quote."
 *
 * This is a second, quieter carousel, separate from FadeCarousel because it
 * behaves differently: no arrows, no dots, no hover-pause. A testimonial that
 * stops advancing the moment a pointer touches it is one the reader will never
 * finish. It cross-fades on a timer and offers manual control with dot buttons.
 *
 * Avatars are initials in a gradient circle rather than photographs — no image
 * assets, and the initial reads clearly at any size.
 */

import { useCallback, useEffect, useState } from 'react';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import Reveal from '@/components/marketing/Reveal';
import SectionGlow from '@/components/marketing/SectionGlow';
import VelvetSweep from '@/background/effect/velvet-sweep';
import './Testimonials.css';

const INTERVAL_MS = 6000;

const QUOTES = [
  {
    id: 't1',
    quote:
      'We replaced four spreadsheets and two systems that never quite agreed with each other. Month-end close went from nine days to two.',
    name: 'Adaeze Okonkwo',
    role: 'Finance Director, Halcyon Trading',
  },
  {
    id: 't2',
    quote:
      'The stock numbers are finally trustworthy. When a warehouse transfer posts, inventory here reflects it before anyone asks.',
    name: 'Ibrahim Sanni',
    role: 'Operations Manager, Sahel Distribution',
  },
  {
    id: 't3',
    quote:
      'Our salespeople were quoting from stale price lists. Now the quote pulls live stock and pricing, and the order is one click from there.',
    name: 'Chioma Eze',
    role: 'Head of Sales, Nimbus Retail',
  },
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const goTo = useCallback((next) => {
    setIndex(((next % QUOTES.length) + QUOTES.length) % QUOTES.length);
  }, []);

  /* Cross-fade on a timer. Stopped under reduced motion so the quotes are just
     read in order rather than swapped out mid-sentence. */
  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % QUOTES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  return (
    <section className="nx-quotes" aria-labelledby="nx-quotes-heading">
      <SectionGlow tone="sky" />
      <VelvetSweep />
      <div className="nx-home__container">
        <Reveal as="h2" step={1} className="nx-quotes__heading nx-heading-fx" id="nx-quotes-heading">
          What our customers say
        </Reveal>

        <Reveal step={2} from="right" distance={24}>
          <div className="nx-quotes__stage">
            {QUOTES.map((item, slideIndex) => (
              <figure
                key={item.id}
                className="nx-quotes__card"
                data-active={slideIndex === index || undefined}
                /* Only the visible quote is exposed; the rest are decorative
                   duplicates at this moment. */
                aria-hidden={slideIndex !== index}
              >
                <blockquote className="nx-quotes__quote">
                  <p>{item.quote}</p>
                </blockquote>

                <figcaption className="nx-quotes__attribution">
                  <span className="nx-quotes__avatar" aria-hidden="true">
                    {item.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')}
                  </span>

                  <span className="nx-quotes__who">
                    <span className="nx-quotes__name">{item.name}</span>
                    <span className="nx-quotes__role">{item.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="nx-quotes__dots">
            {QUOTES.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                className="nx-quotes__dot"
                data-active={dotIndex === index || undefined}
                onClick={() => goTo(dotIndex)}
                aria-label={`Show testimonial from ${item.name}`}
                aria-current={dotIndex === index ? 'true' : undefined}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
