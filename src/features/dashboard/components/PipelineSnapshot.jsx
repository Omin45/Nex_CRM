/**
 * NexERP — PipelineSnapshot
 * ---------------------------------------------------------------------------
 * A read-only funnel summary of the sales pipeline: one row per stage with a
 * proportional bar, plus the weighted total. It answers "where is my revenue
 * sitting?" without making the user open the Kanban board.
 *
 * @example
 * <PipelineSnapshot stages={pipeline} currency="NGN" onSelect={goToStage} />
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import useVendorPath from '@/hooks/useVendorPath';
import { formatCurrency } from '@/utils/currency';
import { LEAD_STAGES } from '@/config/constants';
import { appRoutes } from '@/config/navigation.config';
import './Dashboard.css';

/**
 * @param {object[]} [stages] LEAD_STAGES rows enriched with { count, value }
 * @param {object}   [summary] { totalValue, openDeals, wonThisMonth } from the API
 */
export default function PipelineSnapshot({
  stages = [],
  summary = null,
  currency = 'NGN',
  onSelectStage = null,
}) {
  const navigate = useNavigate();
  const vendorPath = useVendorPath();
  const leadsHref = vendorPath(appRoutes.vendor.sales.leads);

  const rows = useMemo(() => {
    const source = stages.length ? stages : LEAD_STAGES.map((stage) => ({ ...stage, count: 0, value: 0 }));

    return source.map((stage) => ({
      ...stage,
      count: stage.count ?? 0,
      value: stage.value ?? 0,
      /* Weighted by the stage's win probability, which is what makes the
         forecast honest rather than optimistic. */
      weighted: (stage.value ?? 0) * ((stage.probability ?? 0) / 100),
    }));
  }, [stages]);

  const max = useMemo(() => Math.max(...rows.map((row) => row.value), 1), [rows]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          value: acc.value + row.value,
          weighted: acc.weighted + row.weighted,
          count: acc.count + row.count,
        }),
        { value: 0, weighted: 0, count: 0 },
      ),
    [rows],
  );

  const openDeals = summary?.openDeals ?? totals.count;
  const won = summary?.wonThisMonth ?? 0;

  const goToStage = (stage) => {
    if (onSelectStage) {
      onSelectStage(stage);
      return;
    }
    navigate(`${leadsHref}?stage=${stage.id}`);
  };

  return (
    <Card padding="none">
      <Card.Header
        title="Sales pipeline"
        subtitle={`${openDeals} open opportunit${openDeals === 1 ? 'y' : 'ies'}${won ? ` · ${won} won` : ''}`}
        action={
          <Button to={leadsHref} variant="ghost" size="sm">
            Open board
          </Button>
        }
      />

      <Card.Body>
        <div className="nx-pipeline">
          <div className="nx-pipeline__stages">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="nx-pipeline__stage"
                onClick={() => goToStage(row)}
              >
                <span className="nx-pipeline__stage-name" title={row.label}>
                  <Badge tone={row.tone} size="xs" dot>
                    {row.label}
                  </Badge>
                </span>

                <span className="nx-pipeline__bar">
                  <span
                    className={`nx-pipeline__bar-fill is-${row.tone ?? 'accent'}`}
                    style={{ width: `${Math.round((row.value / max) * 100)}%` }}
                  />
                </span>

                <span className="nx-pipeline__stage-value">
                  {formatCurrency(row.value, { currency, compact: true })}{' '}
                  <span className="nx-pipeline__stage-count">× {row.count}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="nx-pipeline__summary">
            <div>
              <p className="text-xs text-dim">Total pipeline</p>
              <p className="text-lg font-semibold numeric">
                {formatCurrency(totals.value, { currency, compact: true })}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p className="text-xs text-dim">Weighted forecast</p>
              <p className="text-lg font-semibold numeric text-accent">
                {formatCurrency(totals.weighted, { currency, compact: true })}
              </p>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
