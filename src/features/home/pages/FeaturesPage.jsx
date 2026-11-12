/**
 * ArkCRM — FeaturesPage
 * ---------------------------------------------------------------------------
 * The full feature catalogue. Each of the eight modules becomes an alternating
 * two-column band: copy and bullet list on one side, a glass panel illustration
 * on the other, mirrored every other row.
 *
 * The module data is imported from the home page's ModulesGrid rather than
 * redefined, so the marketing copy and the home page can never drift apart.
 */

import { FiCheck } from 'react-icons/fi';
import Reveal from '@/components/marketing/Reveal';
import Button from '@/components/ui/Button/Button';
import PageHeader from '../components/PageHeader';
import ModuleVisual from '../components/ModuleVisual';
import { MODULES } from '../components/ModulesGrid';
import { appRoutes } from '@/config/navigation.config';
import './FeaturesPage.css';

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Features"
        title="Everything your business needs, in one workspace"
        text="Eight modules on a single database. A sale updates your stock, your ledger and your reporting in the same transaction — so nothing has to be reconciled twice."
      />

      <div className="nx-features">
        {MODULES.map((module, index) => {
          const isMirrored = index % 2 === 1;

          return (
            <section
              key={module.id}
              id={`module-${module.id}`}
              className="nx-features__band"
              data-mirrored={isMirrored || undefined}
              aria-labelledby={`module-${module.id}-heading`}
            >
              <div className="nx-home__container">
                <div className="nx-features__band-inner">
                  <Reveal
                    step={1}
                    distance={28}
                    className="nx-features__copy"
                  >
                    <span className="nx-features__icon" aria-hidden="true">
                      {module.icon}
                    </span>

                    <h2 className="nx-features__title" id={`module-${module.id}-heading`}>
                      {module.name}
                    </h2>

                    <p className="nx-features__blurb">{module.blurb}</p>

                    <ul className="nx-features__list">
                      {module.details.map((detail) => (
                        <li key={detail} className="nx-features__list-item">
                          <span className="nx-features__check" aria-hidden="true">
                            <FiCheck size={13} />
                          </span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </Reveal>

                  {/* Decorative panel: a miniature product UI for the module,
                      drawn from design tokens rather than a screenshot. */}
                  <Reveal step={2} distance={28} className="nx-features__panel-wrap">
                    <ModuleVisual module={module} />
                  </Reveal>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="nx-features__closing">
        <div className="nx-home__container">
          <Reveal className="nx-features__closing-inner">
            <h2 className="nx-features__closing-title">See it with your own data</h2>
            <p className="nx-features__closing-text">
              Every plan includes a guided setup, and we will import your opening
              balances and product list for you.
            </p>
            <div className="nx-features__closing-actions">
              <Button to={appRoutes.register} variant="primary" size="lg">
                Start free
              </Button>
              <Button to={appRoutes.contact} variant="secondary" size="lg">
                Talk to sales
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
