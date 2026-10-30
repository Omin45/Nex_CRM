/**
 * NexERP — PipelineSummary
 * ---------------------------------------------------------------------------
 * The row of stage totals above the Kanban board.
 *
 * Deliberately not a duplicate of the column headers, which already show a
 * count and a value per stage. This is the *aggregate* read: open pipeline
 * value, closed-won value, and the win rate across the whole board — the three
 * numbers a sales lead wants before they look at any single card. The per-stage
 * breakdown is the board's job.
 */

import Card from '@/components/ui/Card/Card';
import { formatCurrency } from '@/utils/currency';
import './PipelineSummary.css';

/**
 * @param {{id:string,label:string,leads:object[]}[]} columns
 * @param {string} currency ISO code, from the tenant.
 */
export default function PipelineSummary({ columns = [], currency = 'NGN' }) {
  const totals = columns.map((column) => ({
    ...column,
    count: column.leads.length,
    value: column.leads.reduce((sum, lead) => sum + (lead.value ?? 0), 0),
  }));

  /* Open = everything still in play. Excluding won and lost here is the whole
     point: a total that includes closed deals is not a pipeline number. */
  const open = totals.filter((stage) => stage.id !== 'won' && stage.id !== 'lost');
  const won = totals.find((stage) => stage.id === 'won');
  const lost = totals.find((stage) => stage.id === 'lost');

  const openValue = open.reduce((sum, stage) => sum + stage.value, 0);
  const openCount = open.reduce((sum, stage) => sum + stage.count, 0);
  const closedCount = (won?.count ?? 0) + (lost?.count ?? 0);

  /* Win rate is won / every closed deal. Guarded against a zero denominator —
     an empty board is a normal state on day one, not an error. */
  const winRate = closedCount > 0 ? Math.round((won.count / closedCount) * 100) : null;

  const tiles = [
    {
      key: 'open',
      label: 'Open pipeline',
      value: formatCurrency(openValue, { currency, compact: true }),
      hint: `${openCount} active ${openCount === 1 ? 'lead' : 'leads'}`,
      tone: 'info',
    },
    {
      key: 'won',
      label: 'Closed won',
      value: formatCurrency(won?.value ?? 0, { currency, compact: true }),
      hint: `${won?.count ?? 0} ${won?.count === 1 ? 'deal' : 'deals'}`,
      tone: 'success',
    },
    {
      key: 'rate',
      label: 'Win rate',
      // A win rate is a percentage, never a currency — formatting it as money
      // would be a real bug, so it is formatted separately.
      value: winRate == null ? '—' : `${winRate}%`,
      hint: closedCount > 0 ? `of ${closedCount} closed` : 'no closed deals yet',
      tone: 'warning',
    },
  ];

  return (
    <div className="nx-pipeline-summary">
      {tiles.map((tile) => (
        <Card key={tile.key} padding="md" tone={tile.tone}>
          <p className="nx-pipeline-summary__label">{tile.label}</p>
          <p className="nx-pipeline-summary__value">{tile.value}</p>
          <p className="nx-pipeline-summary__hint">{tile.hint}</p>
        </Card>
      ))}
    </div>
  );
}
