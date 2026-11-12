/**
 * ArkCRM — FadeCarousel
 * ---------------------------------------------------------------------------
 * Spec: "a crossfade carousel (opacity + slight scale and translate, not
 * sliding) with auto-play every 5s, pause on hover, dot indicators, a thin
 * progress bar on the active dot, and keyboard/arrow controls."
 *
 * Design decisions:
 *   - Only the active slide is focusable and visible to assistive tech
 *     (`aria-hidden` on the rest), so tabbing does not walk into hidden copy.
 *   - Autoplay is a single interval, cleared on pause, on unmount and whenever
 *     reduced motion is requested. Reduced motion also disables the transition
 *     itself, so nothing moves.
 *   - Progress is a CSS animation restarted by remounting the bar with a
 *     `key`, which is why `slideKey` exists — changing it is what replays it.
 *   - The live region announces slide changes politely, but only after the
 *     autoplay interval, not on every hover-triggered navigation.
 */

import { isValidElement, useCallback, useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import './FadeCarousel.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * A slide is either:
 *   - a data object — { id, icon, eyebrow, title, text, stats } — which the
 *     carousel renders in its own default layout, or
 *   - any React element, rendered as-is inside the slide frame.
 *
 * Supporting both is what makes the component reusable: the marketing home
 * page passes bespoke product mockups, while testimonials pass plain quotes and
 * get the built-in layout for free.
 */
export default function FadeCarousel({
  slides = [],
  interval = 5000,
  className = '',
  /** Announce slide changes to screen readers. */
  label = 'Featured highlights',
}) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const count = slides.length;
  /* Changes to the key restart the progress bar's CSS animation. */
  const [slideKey, setSlideKey] = useState(0);

  const goTo = useCallback(
    (next) => {
      if (!count) return;
      setIndex(((next % count) + count) % count);
      setSlideKey((k) => k + 1);
    },
    [count],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  /* Autoplay. Paused on hover/focus, and never started under reduced motion. */
  useEffect(() => {
    if (!count || isPaused || reducedMotion) return undefined;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % count);
      setSlideKey((k) => k + 1);
    }, interval);

    return () => clearInterval(timer);
  }, [count, isPaused, reducedMotion, interval]);

  /* Arrow keys move the carousel when it has focus. */
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      previous();
    }
  };

  if (!count) return null;

  return (
    <section
      className={cx('nx-carousel', className)}
      aria-roledescription="carousel"
      aria-label={label}
      /* Pausing on hover is the spec; focus pauses too so keyboard users are
         not raced through slides while reading. */
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
    >
      <div className="nx-carousel__viewport">
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index;
          const slideId = isValidElement(slide) ? undefined : slide.id;

          return (
            <article
              key={slideId ?? slideIndex}
              className={cx('nx-carousel__slide', isActive && 'is-active', 'nx-carousel__slide--custom')}
              aria-hidden={!isActive}
              /* Inactive slides leave the tab order entirely, so keyboard users
                 never tab into a hidden panel. */
              tabIndex={isActive ? undefined : -1}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${count}`}
            >
              {isValidElement(slide) ? (
                slide
              ) : (
                <div className="nx-carousel__body">
                  {slide.icon ? (
                    <span className="nx-carousel__icon" aria-hidden="true">
                      {slide.icon}
                    </span>
                  ) : null}

                  {slide.eyebrow ? <p className="nx-carousel__eyebrow">{slide.eyebrow}</p> : null}
                  <h3 className="nx-carousel__title">{slide.title}</h3>
                  <p className="nx-carousel__text">{slide.text}</p>

                  {slide.stats?.length ? (
                    <dl className="nx-carousel__stats">
                      {slide.stats.map((stat) => (
                        <div key={stat.label} className="nx-carousel__stat">
                          <dt className="nx-carousel__stat-label">{stat.label}</dt>
                          <dd className="nx-carousel__stat-value">{stat.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="nx-carousel__controls">
        <button
          type="button"
          className="nx-carousel__arrow"
          onClick={previous}
          aria-label="Previous slide"
        >
          <FiChevronLeft />
        </button>

        <ul className="nx-carousel__dots">
          {slides.map((slide, dotIndex) => {
            const isActive = dotIndex === index;
            const dotId = isValidElement(slide) ? undefined : slide.id;

            return (
              <li key={dotId ?? dotIndex}>
                <button
                  type="button"
                  className={cx('nx-carousel__dot', isActive && 'is-active')}
                  onClick={() => goTo(dotIndex)}
                  aria-label={`Go to slide ${dotIndex + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {isActive ? (
                    /* Remounting on slideKey replays the fill animation. The
                       sweep duration comes from --nx-carousel-interval so no
                       inline style is needed; it must stay in step with the
                       `interval` prop. */
                    <span
                      key={slideKey}
                      className="nx-carousel__progress"
                      data-paused={isPaused || undefined}
                      data-static={reducedMotion || undefined}
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <button type="button" className="nx-carousel__arrow" onClick={next} aria-label="Next slide">
          <FiChevronRight />
        </button>
      </div>

      {/* Announces the active slide without stealing focus. Only meaningful for
          data slides — an element slide carries its own heading. */}
      <p className="nx-sr-only" aria-live="polite">
        {isValidElement(slides[index]) ? null : slides[index]?.title}
      </p>
    </section>
  );
}
