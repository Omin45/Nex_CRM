/**
 * NexERP — PageHeader
 * ---------------------------------------------------------------------------
 * The shared opening block for the inner marketing pages (features, pricing,
 * about, contact) so they all start with the same rhythm instead of each one
 * inventing a hero.
 *
 * The eyebrow is the section name, the title is the promise, and the text is one
 * or two sentences of qualification. All three are props so the page owns its
 * content.
 */

import Reveal from '@/components/marketing/Reveal';
import SectionGlow from '@/components/marketing/SectionGlow';
import './PageHeader.css';

export default function PageHeader({ eyebrow, title, text, children }) {
  return (
    <header className="nx-page-header">
      <SectionGlow tone="accent" />
      <div className="nx-home__container">
        {eyebrow ? (
          <Reveal as="p" step={1} className="nx-page-header__eyebrow">
            {eyebrow}
          </Reveal>
        ) : null}

        <Reveal as="h1" step={2} className="nx-page-header__title">
          {title}
        </Reveal>

        {text ? (
          <Reveal as="p" step={3} className="nx-page-header__text">
            {text}
          </Reveal>
        ) : null}

        {children ? (
          <Reveal step={4} className="nx-page-header__extra">
            {children}
          </Reveal>
        ) : null}
      </div>
    </header>
  );
}
