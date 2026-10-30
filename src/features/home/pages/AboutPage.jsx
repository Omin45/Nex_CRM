/**
 * NexERP — AboutPage
 * ---------------------------------------------------------------------------
 * The company page: a positioning statement, a short history, the principles
 * the product is built on, and the team.
 *
 * Deliberately not a stock-photo page. Team members are rendered as gradient
 * initials, and the "story" beats are text and numbers — a company page made of
 * claims and figures is more credible than one made of stock imagery.
 */

import { FiTarget, FiEye, FiShield, FiZap } from 'react-icons/fi';
import Reveal from '@/components/marketing/Reveal';
import Button from '@/components/ui/Button/Button';
import PageHeader from '../components/PageHeader';
import { appRoutes } from '@/config/navigation.config';
import './AboutPage.css';

const PRINCIPLES = [
  {
    icon: <FiTarget />,
    title: 'One source of truth',
    body: 'A number should exist once. If sales, stock and the ledger can disagree, someone is fixing it by hand every month — and getting it wrong.',
  },
  {
    icon: <FiEye />,
    title: 'Show the working',
    body: 'Every report drills through to the transactions behind it. If you cannot trace a figure to its source, it is not a report, it is a rumour.',
  },
  {
    icon: <FiShield />,
    title: 'Permissions by default',
    body: 'Access follows the person, not the screen. Audit history is written by the system, not by whoever remembered to keep it.',
  },
  {
    icon: <FiZap />,
    title: 'Boring where it counts',
    body: 'Double-entry accounting should be dull and reliable. We spend our novelty budget on the interface, not on the ledger.',
  },
];

const MILESTONES = [
  { year: '2021', event: 'Founded by two accountants and a warehouse manager.' },
  { year: '2022', event: 'First multi-vendor release, with tenant-scoped data from day one.' },
  { year: '2023', event: 'Inventory and accounting reconciled to the same ledger.' },
  { year: '2024', event: 'HR, projects and support added; 100th business onboarded.' },
  { year: '2025', event: '500 businesses across 120 countries, and the eighth module shipped.' },
];

const TEAM = [
  { name: 'Developer John', role: 'Co-founder, Finance', initials: 'DJ' },
  { name: 'Emmanuel ( Pushin .P)', role: 'Co-founder, Engineering', initials: 'EP' },
  { name: 'Zion (2 fresh)', role: 'Head of Product', initials: 'Z2' },
  { name: 'Richie', role: 'Head of Customer Success', initials: 'R' },
  { name: 'JOEL', role: 'Lead Developer', initials: 'J' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Built by people who had to close the books by hand"
        text="NexERP exists because a spreadsheet is a fine place to start and a terrible place to finish. We make the system of record that replaces it."
      />

      {/* ---- principles ---- */}
      <section className="nx-about__principles" aria-labelledby="nx-about-principles">
        <div className="nx-home__container">
          <h2 className="nx-about__heading" id="nx-about-principles">
            What we hold to
          </h2>

          <ul className="nx-about__principle-grid">
            {PRINCIPLES.map((principle, index) => (
              <Reveal
                as="li"
                key={principle.title}
                step={(index % 2) + 1}
                className="nx-about__principle"
              >
                <span className="nx-about__principle-icon" aria-hidden="true">
                  {principle.icon}
                </span>
                <h3 className="nx-about__principle-title">{principle.title}</h3>
                <p className="nx-about__principle-body">{principle.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- history ---- */}
      <section className="nx-about__history" aria-labelledby="nx-about-history">
        <div className="nx-home__container">
          <h2 className="nx-about__heading" id="nx-about-history">
            How we got here
          </h2>

          <ol className="nx-about__timeline">
            {MILESTONES.map((milestone, index) => (
              <Reveal
                as="li"
                key={milestone.year}
                step={index + 1}
                className="nx-about__milestone"
              >
                <span className="nx-about__year">{milestone.year}</span>
                <span className="nx-about__event">{milestone.event}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- team ---- */}
      <section className="nx-about__team" aria-labelledby="nx-about-team">
        <div className="nx-home__container">
          <h2 className="nx-about__heading" id="nx-about-team">
            The people
          </h2>

          <ul className="nx-about__team-grid">
            {TEAM.map((person, index) => (
              <Reveal as="li" key={person.name} step={(index % 4) + 1} className="nx-about__person">
                <span className="nx-about__avatar" aria-hidden="true">
                  {person.initials}
                </span>
                <span className="nx-about__person-name">{person.name}</span>
                <span className="nx-about__person-role">{person.role}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- closing ---- */}
      <section className="nx-about__closing">
        <div className="nx-home__container">
          <Reveal className="nx-about__closing-inner">
            <h2 className="nx-about__closing-title">Come and see it</h2>
            <p className="nx-about__closing-text">
              The fastest way to judge an ERP is to put your own numbers through it.
            </p>
            <div className="nx-about__closing-actions">
              <Button to={appRoutes.register} variant="primary" size="lg">
                Start free
              </Button>
              <Button to={appRoutes.contact} variant="secondary" size="lg">
                Contact us
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
