/**
 * NexERP — ModuleVisual
 * ---------------------------------------------------------------------------
 * A miniature, decorative product UI for each module on the Features page.
 * Instead of a stock photo, each panel renders a small on-brand mock of the
 * screen that module actually represents — a pipeline board for Sales, stock
 * bars for Inventory, a ledger for Accounting, and so on.
 *
 * Everything is built from divs and design tokens: no images, no screenshots.
 * That keeps it from going stale when the product changes and lets it theme
 * correctly in both light and dark. Decorative by contract — `aria-hidden`.
 */

import { FiCheck, FiSearch } from 'react-icons/fi';
import './ModuleVisual.css';

function Chrome({ title }) {
  return (
    <div className="nx-modvis__chrome">
      <span className="nx-modvis__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="nx-modvis__chrome-title">{title}</span>
      <span className="nx-modvis__chrome-pill">Live</span>
    </div>
  );
}

/* ---- Sales: pipeline board ---------------------------------------------- */
const SALES_COLUMNS = [
  { stage: 'Lead', count: 42, deals: [['Northwind', '$4.2k'], ['Globex', '$2.8k']] },
  { stage: 'Qualify', count: 18, deals: [['Initech', '$6.1k']] },
  { stage: 'Quote', count: 9, deals: [['Umbrella', '$9.4k'], ['Soylent', '$3.3k']] },
  { stage: 'Won', count: 6, deals: [['Hooli', '$12.0k']] },
];

function SalesBody() {
  return (
    <>
      <div className="nx-modvis__kpis">
        <div className="nx-modvis__kpi">
          <b>$48.2k</b>
          <span>Won</span>
        </div>
        <div className="nx-modvis__kpi">
          <b>31%</b>
          <span>Win rate</span>
        </div>
        <div className="nx-modvis__kpi">
          <b>4.2d</b>
          <span>Cycle</span>
        </div>
      </div>

      <div className="nx-modvis__board">
        {SALES_COLUMNS.map((col) => (
          <div className="nx-modvis__col" key={col.stage}>
            <div className="nx-modvis__col-head">
              <span>{col.stage}</span>
              <span className="nx-modvis__count">{col.count}</span>
            </div>
            {col.deals.map(([name, amount]) => (
              <div className="nx-modvis__deal" key={name}>
                <span className="nx-modvis__deal-name">{name}</span>
                <span className="nx-modvis__deal-amount">{amount}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/* ---- Inventory: stock levels -------------------------------------------- */
const STOCK_ROWS = [
  ['Main warehouse', '1,240'],
  ['Retail floor', '318'],
  ['Overflow', '96'],
  ['In transit', '204'],
];

function InventoryBody() {
  return (
    <>
      <div className="nx-modvis__stock">
        {STOCK_ROWS.map(([name, qty]) => (
          <div className="nx-modvis__stock-row" key={name}>
            <span className="nx-modvis__stock-name">{name}</span>
            <span className="nx-modvis__track">
              <span className="nx-modvis__fill" />
            </span>
            <span className="nx-modvis__stock-qty">{qty}</span>
          </div>
        ))}
      </div>

      <div className="nx-modvis__notice">
        <span className="nx-modvis__dot nx-modvis__dot--warn" />
        Reorder point reached · 3 SKUs
      </div>
    </>
  );
}

/* ---- Accounting: ledger -------------------------------------------------- */
const LEDGER_ROWS = [
  ['INV-2043 · Acme Corp', '+$4,200', 'in'],
  ['BILL-1180 · Parts Ltd', '−$1,860', 'out'],
  ['INV-2044 · Globex', '+$2,900', 'in'],
  ['EXP-332 · Utilities', '−$410', 'out'],
];

function AccountingBody() {
  return (
    <>
      <div className="nx-modvis__entries">
        {LEDGER_ROWS.map(([label, amount, tone]) => (
          <div className="nx-modvis__entry" key={label}>
            <span className="nx-modvis__entry-label">{label}</span>
            <span className="nx-modvis__entry-amount" data-tone={tone}>
              {amount}
            </span>
          </div>
        ))}
      </div>

      <div className="nx-modvis__seal">
        <FiCheck size={12} aria-hidden="true" />
        Ledger balanced
      </div>
    </>
  );
}

/* ---- HR: team + attendance ---------------------------------------------- */
const PEOPLE = ['AK', 'RM', 'JD', 'SO', 'TN', 'LP'];

function HrBody() {
  return (
    <>
      <div className="nx-modvis__people">
        {PEOPLE.map((initials) => (
          <span className="nx-modvis__avatar" key={initials}>
            {initials}
          </span>
        ))}
      </div>

      <div className="nx-modvis__heat" aria-hidden="true">
        {Array.from({ length: 35 }, (_, i) => (
          <i key={i} />
        ))}
      </div>

      <div className="nx-modvis__meta">
        <span>Present 92%</span>
        <span>On leave 4</span>
        <span>Open roles 2</span>
      </div>
    </>
  );
}

/* ---- Projects: kanban + sprint ------------------------------------------ */
const LANES = [
  { name: 'Backlog', tasks: ['Discovery call', 'Sitemap draft'] },
  { name: 'Doing', tasks: ['API integration', 'Design review'] },
  { name: 'Done', tasks: ['Kickoff'] },
];

function ProjectsBody() {
  return (
    <>
      <div className="nx-modvis__lanes">
        {LANES.map((lane) => (
          <div className="nx-modvis__lane" key={lane.name}>
            <span className="nx-modvis__lane-head">{lane.name}</span>
            {lane.tasks.map((task) => (
              <span className="nx-modvis__task" key={task}>
                {task}
                <span className="nx-modvis__task-bar">
                  <i />
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="nx-modvis__progress">
        <div className="nx-modvis__progress-head">
          <span>Sprint 12</span>
          <span>68%</span>
        </div>
        <span className="nx-modvis__track">
          <span className="nx-modvis__fill" />
        </span>
      </div>
    </>
  );
}

/* ---- Support: ticket queue ---------------------------------------------- */
const TICKETS = [
  ['#4821 · Login issue', 'Open', 'warn'],
  ['#4820 · Refund request', 'Pending', 'info'],
  ['#4819 · Data sync error', 'Resolved', 'ok'],
];

function SupportBody() {
  return (
    <div className="nx-modvis__tickets">
      {TICKETS.map(([label, status, tone]) => (
        <div className="nx-modvis__ticket" key={label}>
          <span className="nx-modvis__ticket-label">{label}</span>
          <span className="nx-modvis__pill" data-tone={tone}>
            {status}
          </span>
          <span className="nx-modvis__track">
            <span className="nx-modvis__fill" />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---- Reports: chart ------------------------------------------------------ */
function ReportsBody() {
  return (
    <>
      <div className="nx-modvis__chart" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} />
        ))}
      </div>

      <div className="nx-modvis__legend">
        <span>
          <i className="nx-modvis__swatch" />
          Revenue
        </span>
        <span>
          <i className="nx-modvis__swatch nx-modvis__swatch--alt" />
          Expenses
        </span>
      </div>
    </>
  );
}

/* ---- Documents: file list ----------------------------------------------- */
const FILES = [
  { name: 'Contract · Acme.pdf', type: 'PDF', size: '1.2 MB' },
  { name: 'Q3-invoices.xlsx', type: 'XLS', size: '840 KB' },
  { name: 'Floorplan-v3.png', type: 'IMG', size: '2.4 MB' },
  { name: 'Onboarding.docx', type: 'DOC', size: '300 KB' },
];

function DocumentsBody() {
  return (
    <>
      <div className="nx-modvis__search">
        <FiSearch size={13} aria-hidden="true" />
        Search documents…
      </div>

      <div className="nx-modvis__files">
        {FILES.map((file) => (
          <div className="nx-modvis__file" key={file.name}>
            <span className="nx-modvis__file-badge">{file.type}</span>
            <span className="nx-modvis__file-name">{file.name}</span>
            <span className="nx-modvis__file-size">{file.size}</span>
          </div>
        ))}
      </div>
    </>
  );
}

const BODIES = {
  sales: SalesBody,
  inventory: InventoryBody,
  accounting: AccountingBody,
  hr: HrBody,
  projects: ProjectsBody,
  support: SupportBody,
  reports: ReportsBody,
  documents: DocumentsBody,
};

export default function ModuleVisual({ module }) {
  const Body = BODIES[module.id] ?? SalesBody;

  return (
    <div className="nx-modvis" data-module={module.id} aria-hidden="true">
      <Chrome title={module.name} />
      <div className="nx-modvis__body">
        <Body />
      </div>
    </div>
  );
}
