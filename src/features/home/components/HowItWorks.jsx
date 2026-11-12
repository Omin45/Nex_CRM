/**
 * ArkCRM — HowItWorks
 * ---------------------------------------------------------------------------
 * Spec: "'How it works' with 4 numbered steps (Sign up, Import your data,
 * Configure, Go live) connected by a single vertical gradient line, each step
 * fading in as it enters the viewport."
 *
 * The connecting line is one ::before pseudo-element on the <ol>, not a border
 * on each <li>. That matters: a per-item border cannot know where the list
 * actually ends, and it leaves a stub below the last step. One gradient rail
 * with a height in `em`-free percentage terms reads as a single continuous
 * stroke, and it stops at the last marker.
 *
 * The rail is a gradient from transparent -> accent -> transparent so it fades
 * in at the top and out at the bottom rather than being cut off.
 */

import { FiUserPlus, FiDownload, FiSliders, FiFlag } from 'react-icons/fi';
import Reveal from '@/components/marketing/Reveal';
import SectionGlow from '@/components/marketing/SectionGlow';
import MistOrb from '@/background/effect/mist-orb';
import './HowItWorks.css';

const STEPS = [
  {
    title: 'Sign up',
    icon: <FiUserPlus />,
    body: 'Create your workspace and invite your team. Roles and permissions are set per person, not per screen.',
  },
  {
    title: 'Import your data',
    icon: <FiDownload />,
    body: 'Bring customers, products and opening balances across from a spreadsheet or your previous system.',
  },
  {
    title: 'Configure',
    icon: <FiSliders />,
    body: 'Set your tax rates, currencies, warehouses and approval rules. Templates cover the common cases.',
  },
  {
    title: 'Go live',
    icon: <FiFlag />,
    body: 'Start selling. Your first invoice posts to the ledger and shows up in reporting immediately.',
  },
];

export default function HowItWorks() {
  return (
    <section className="nx-steps" aria-labelledby="nx-steps-heading">
      <SectionGlow tone="indigo" />
      <MistOrb />
      <div className="nx-home__container">
        <Reveal as="h2" step={1} className="nx-steps__heading nx-heading-fx" id="nx-steps-heading">
          Live in four steps
        </Reveal>

        <ol className="nx-steps__list">
          {STEPS.map((step, index) => (
            <Reveal
              as="li"
              key={step.title}
              step={index + 2}
              from={index % 2 === 0 ? 'left' : 'right'}
              className="nx-steps__item"
            >
              {/* The number is the marker the rail passes behind. */}
              <span className="nx-steps__marker" aria-hidden="true">
                {index + 1}
              </span>

              <div className="nx-steps__body">
                <span className="nx-steps__icon" aria-hidden="true">
                  {step.icon}
                </span>
                <h3 className="nx-steps__title">{step.title}</h3>
                <p className="nx-steps__text">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
