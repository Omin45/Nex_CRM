/**
 * ArkCRM — ProductShowcase
 * ---------------------------------------------------------------------------
 * Spec: "'Trusted by teams' — a fade carousel of 4 static product mockups with
 * company names, using the FadeCarousel component (cross-fade every 5 seconds,
 * pause on hover, previous/next arrows and dot indicators with a progress bar)."
 *
 * The "static mockups" are the same CSS-composition technique as the hero's
 * DashboardMockup, specialised into four small variants. They are decorative and
 * aria-hidden; the caption below the frame carries the information.
 */

import FadeCarousel from '@/components/marketing/FadeCarousel';
import Reveal from '@/components/marketing/Reveal';
import SectionGlow from '@/components/marketing/SectionGlow';
import { FiTrendingUp, FiPackage, FiBook, FiBarChart2 } from 'react-icons/fi';
import './ProductShowcase.css';

const SHOWCASE = [
  {
    id: 'pipeline',
    name: 'Halcyon Trading',
    icon: <FiTrendingUp />,
    caption: 'Pipeline',
    blurb: 'A 320-deal pipeline, weighted and forecast without a spreadsheet in sight.',
    rows: [
      { label: 'Renewal — Meridian Foods', value: '₦1.2M' },
      { label: 'Expansion — Kola Mills', value: '₦840K' },
      { label: 'New — BrightPath', value: '₦310K' },
    ],
  },
  {
    id: 'inventory',
    name: 'Sahel Distribution',
    icon: <FiPackage />,
    caption: 'Inventory',
    blurb: 'Stock across four warehouses, reconciled to the last movement.',
    rows: [
      { label: 'Warehouse — Lagos', value: '12,480 units' },
      { label: 'Warehouse — Kano', value: '6,120 units' },
      { label: 'Reorder alerts', value: '7 SKUs' },
    ],
  },
  {
    id: 'accounting',
    name: 'Apex Manufacturing',
    icon: <FiBook />,
    caption: 'Accounting',
    blurb: 'Invoices posted, receivables aged, ledger balanced at month end.',
    rows: [
      { label: 'Receivables — current', value: '₦3.4M' },
      { label: 'Receivables — 30d', value: '₦620K' },
      { label: 'Payables due', value: '₦1.1M' },
    ],
  },
  {
    id: 'reports',
    name: 'Nimbus Retail',
    icon: <FiBarChart2 />,
    caption: 'Reporting',
    blurb: 'Profit and loss drillable down to the invoice that produced it.',
    rows: [
      { label: 'Gross margin', value: '38.4%' },
      { label: 'Operating expenses', value: '₦980K' },
      { label: 'Net profit', value: '₦1.1M' },
    ],
  },
];

/** Bars per chart. Their heights are variant rules in ProductShowcase.css. */
const SHOWCASE_BAR_COUNT = 7;

/** One slide's frame. Reused by every panel in the carousel.
    `data-variant` selects the chart silhouette in ProductShowcase.css — the
    shapes are set dressing, not data, so they live in the stylesheet rather
    than in inline custom properties. */
function ShowcaseSlide({ item }) {
  return (
    <div className="nx-showcase__slide">
      <div className="nx-showcase__chrome" aria-hidden="true">
        <span className="nx-showcase__dot" />
        <span className="nx-showcase__dot" />
        <span className="nx-showcase__dot" />
        <span className="nx-showcase__url">{item.name.toLowerCase().replace(/\s+/g, '')}.arkcrm.app</span>
      </div>

      <div className="nx-showcase__panel" data-variant={item.id} aria-hidden="true">
        <div className="nx-showcase__rows">
          {item.rows.map((row) => (
            <div key={row.label} className="nx-showcase__row">
              <span className="nx-showcase__row-label">{row.label}</span>
              <span className="nx-showcase__row-value">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="nx-showcase__chart">
          {Array.from({ length: SHOWCASE_BAR_COUNT }, (_, index) => (
            <span key={index} className="nx-showcase__bar" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductShowcase() {
  return (
    <section className="nx-showcase" aria-labelledby="nx-showcase-heading">
      <SectionGlow tone="accent" />
      <div className="nx-home__container">
        <Reveal as="h2" step={1} className="nx-showcase__heading nx-heading-fx" id="nx-showcase-heading">
          Trusted by teams
        </Reveal>

        <Reveal as="p" step={2} className="nx-showcase__sub">
          Four businesses, four very different operations, one system of record.
        </Reveal>

        <Reveal step={3} from="left" distance={32}>
          <FadeCarousel
            label="ArkCRM in use at four companies"
            className="nx-showcase__carousel"
            slides={SHOWCASE.map((item) => (
              <ShowcaseSlide key={item.id} item={item} />
            ))}
          />
        </Reveal>

        {/* Captions are outside the carousel so they are always in the
            accessibility tree, not hidden behind the active-panel logic. */}
        <ul className="nx-showcase__legend">
          {SHOWCASE.map((item) => (
            <li key={item.id} className="nx-showcase__legend-item">
              <span className="nx-showcase__legend-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nx-showcase__legend-name">{item.name}</span>
              <span className="nx-showcase__legend-caption">{item.caption}</span>
              <span className="nx-showcase__legend-blurb">{item.blurb}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
