/**
 * NexERP — ModulesGrid
 * ---------------------------------------------------------------------------
 * Spec: "a section titled 'Everything your business needs' with 8 glass cards
 * in a 4x2 grid, each with its own icon, a hover glow and a border that lights
 * up. Modules: Sales & CRM, Inventory, Accounting, Human Resources, Projects,
 * Customer Support, Reports & Analytics, Documents."
 *
 * The list is data, not markup: it is reused by the Features page, which
 * expands each entry with a longer description and a bullet list.
 */

import {
  FiTrendingUp,
  FiPackage,
  FiBook,
  FiUsers,
  FiLayers,
  FiLifeBuoy,
  FiBarChart2,
  FiFolder,
} from 'react-icons/fi';
import Reveal from '@/components/marketing/Reveal';
import SectionGlow from '@/components/marketing/SectionGlow';
import './ModulesGrid.css';

/** Single source of truth for the module catalogue. */
export const MODULES = [
  {
    id: 'sales',
    name: 'Sales & CRM',
    icon: <FiTrendingUp />,
    blurb: 'Pipeline, quotes and orders in one thread.',
    details: [
      'Drag-and-drop pipeline with weighted stages',
      'Quote-to-order without retyping',
      'Full activity history on every account',
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    icon: <FiPackage />,
    blurb: 'Live stock levels across every location.',
    details: [
      'Multi-warehouse transfers and adjustments',
      'Reorder points with low-stock alerts',
      'Serial, batch and expiry tracking',
    ],
  },
  {
    id: 'accounting',
    name: 'Accounting',
    icon: <FiBook />,
    blurb: 'Invoices, expenses and a real double-entry ledger.',
    details: [
      'Invoices, receivables and payables',
      'Expense capture with approval flow',
      'Trial balance that always balances',
    ],
  },
  {
    id: 'hr',
    name: 'Human Resources',
    icon: <FiUsers />,
    blurb: 'People, attendance, leave and payroll inputs.',
    details: [
      'Employee records with role and pay data',
      'Attendance and leave requests',
      'Headcount and cost-per-employee reporting',
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: <FiLayers />,
    blurb: 'Plan the work, track the hours, bill the result.',
    details: [
      'Milestones, tasks and dependencies',
      'Billable hours rolled into invoices',
      'Budget burn-down by project',
    ],
  },
  {
    id: 'support',
    name: 'Customer Support',
    icon: <FiLifeBuoy />,
    blurb: 'Tickets that carry the account history with them.',
    details: [
      'Ticket queue with SLA timers',
      'Every ticket shows the customer ledger',
      'Canned responses and assignment rules',
    ],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    icon: <FiBarChart2 />,
    blurb: 'Live reporting on every figure in the system.',
    details: [
      'Profit and loss, balance sheet, cash flow',
      'Scheduled exports to CSV and PDF',
      'Drill from any number back to its source',
    ],
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: <FiFolder />,
    blurb: 'Every file attached to the record it belongs to.',
    details: [
      'Versioned attachments on customers and orders',
      'Shared workspace with role-based access',
      'Search across every document you have stored',
    ],
  },
];

export default function ModulesGrid() {
  return (
    <section className="nx-modules" id="modules" aria-labelledby="nx-modules-heading">
      <SectionGlow tone="sky" />
      <div className="nx-home__container">
        <Reveal as="h2" step={1} className="nx-modules__heading nx-heading-fx" id="nx-modules-heading">
          Everything your business needs
        </Reveal>

        <Reveal as="p" step={2} className="nx-modules__sub">
          Eight modules that share one database, so a sale updates your stock,
          your ledger and your reporting at the same moment.
        </Reveal>

        <ul className="nx-modules__grid">
          {MODULES.map((module, index) => (
            <Reveal
              as="li"
              key={module.id}
              step={(index % 4) + 3}
              from={index % 2 === 0 ? 'left' : 'right'}
              className="nx-modules__cell"
            >
              <article className="nx-modules__card">
                <span className="nx-modules__icon" aria-hidden="true">
                  {module.icon}
                </span>

                <h3 className="nx-modules__name">{module.name}</h3>
                <p className="nx-modules__blurb">{module.blurb}</p>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
