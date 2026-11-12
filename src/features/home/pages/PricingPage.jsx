/**
 * ArkCRM — PricingPage
 * ---------------------------------------------------------------------------
 * Three plans with a monthly/annual toggle.
 *
 * The toggle changes what the *displayed* price is, and the annual figure is
 * the honest one: it is the monthly price times twelve, minus the two months
 * free that the badge advertises, shown rounded to whole currency units. The
 * per-month saving is computed from those same two numbers, so the badge and
 * the price can never disagree.
 */

import { useMemo, useState } from 'react';
import { FiCheck, FiMinus } from 'react-icons/fi';
import Reveal from '@/components/marketing/Reveal';
import Button from '@/components/ui/Button/Button';
import PageHeader from '../components/PageHeader';
import { appRoutes } from '@/config/navigation.config';
import './PricingPage.css';

/** Months charged up-front on an annual plan. */
const MONTHS_PER_YEAR = 12;
/** Two months free, which is what the "save 17%" badge works out to. */
const ANNUAL_FREE_MONTHS = 2;

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 29,
    tagline: 'For a single-location business getting off spreadsheets.',
    features: [
      '1 user, 1 location',
      'Sales, inventory and invoicing',
      'Up to 1,000 products',
      'Email support',
    ],
    cta: 'Start free',
    highlighted: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    monthly: 79,
    tagline: 'For a growing team that needs the modules talking to each other.',
    features: [
      'Up to 10 users, 3 locations',
      'All eight modules',
      'Unlimited products and customers',
      'Accounting, HR and projects',
      'Priority support',
    ],
    cta: 'Start free',
    highlighted: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    monthly: 179,
    tagline: 'For multi-entity operations with audit obligations.',
    features: [
      'Unlimited users and locations',
      'Multi-entity consolidation',
      'Role-based permissions and audit log',
      'Warehouse transfers and serial tracking',
      'Dedicated account manager',
    ],
    cta: 'Talk to sales',
    highlighted: false,
  },
];

/** Everything a plan is NOT included in. Prevents the FAQ from being a lie. */
const EXCLUDED = ['No per-transaction fees', 'No charge for read-only users', 'Cancel any time'];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  /* One source of truth for the arithmetic, so the badge and the price agree. */
  const view = useMemo(
    () =>
      PLANS.map((plan) => {
        const yearTotal = plan.monthly * (MONTHS_PER_YEAR - ANNUAL_FREE_MONTHS);
        const monthlyEquivalent = Math.round(yearTotal / MONTHS_PER_YEAR);
        return {
          ...plan,
          price: annual ? monthlyEquivalent : plan.monthly,
          cadence: annual ? 'mo, billed yearly' : 'mo, billed monthly',
          yearTotal,
        };
      }),
    [annual],
  );

  const savingPercent = Math.round(
    (ANNUAL_FREE_MONTHS / MONTHS_PER_YEAR) * 100,
  );

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Priced per workspace, not per transaction"
        text="Every plan includes all eight modules. You are never charged extra for taking an invoice, recording a movement or running a report."
      >
        <div className="nx-pricing__toggle-wrap">
          {/* A real switch, not two buttons: the state is a single boolean. */}
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            className="nx-pricing__toggle"
            onClick={() => setAnnual((value) => !value)}
          >
            <span className="nx-pricing__toggle-option" data-selected={!annual || undefined}>
              Monthly
            </span>
            <span className="nx-pricing__toggle-option" data-selected={annual || undefined}>
              Annual
              <span className="nx-pricing__saving">save {savingPercent}%</span>
            </span>
            <span className="nx-pricing__toggle-thumb" aria-hidden="true" />
          </button>
        </div>
      </PageHeader>

      <div className="nx-pricing">
        <div className="nx-home__container">
          <ul className="nx-pricing__grid">
            {view.map((plan, index) => (
              <Reveal
                as="li"
                key={plan.id}
                step={index + 1}
                className="nx-pricing__cell"
                /* On the stacked mobile layout the featured plan leads. */
                data-order={plan.highlighted ? 'featured' : undefined}
              >
                <article
                  className="nx-pricing__card"
                  data-highlighted={plan.highlighted || undefined}
                >
                  {plan.highlighted ? (
                    <span className="nx-pricing__flag">Most popular</span>
                  ) : null}

                  <h2 className="nx-pricing__name">{plan.name}</h2>
                  <p className="nx-pricing__tagline">{plan.tagline}</p>

                  <p className="nx-pricing__price">
                    <span className="nx-pricing__currency" aria-hidden="true">
                      $
                    </span>
                    <span className="nx-pricing__amount">{plan.price}</span>
                    <span className="nx-pricing__cadence">{plan.cadence}</span>
                  </p>

                  <Button
                    to={appRoutes.register}
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                    size="lg"
                    fullWidth
                  >
                    {plan.cta}
                  </Button>

                  <ul className="nx-pricing__features">
                    {plan.features.map((feature) => (
                      <li key={feature} className="nx-pricing__feature">
                        <span className="nx-pricing__check" aria-hidden="true">
                          <FiCheck size={13} />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </ul>

          <Reveal className="nx-pricing__excluded">
            {EXCLUDED.map((item) => (
              <span key={item} className="nx-pricing__excluded-item">
                <FiMinus size={14} aria-hidden="true" />
                {item}
              </span>
            ))}
          </Reveal>

          <Reveal className="nx-pricing__footnote">
            <p>
              Prices are per workspace and exclude statutory taxes. Need
              something different — on-premise, or a plan that fits a franchise
              group?{' '}
              <a href={`${appRoutes.contact}`}>Talk to sales</a> and we will work
              it out.
            </p>
          </Reveal>
        </div>
      </div>
    </>
  );
}
