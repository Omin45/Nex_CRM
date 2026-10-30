/**
 * NexERP — SalesPipelinePage
 * ---------------------------------------------------------------------------
 * The sales pipeline: aggregate tiles above a KanbanBoard.
 *
 * The board owns the drag interaction (see components/KanbanBoard.jsx); this
 * page owns the data. A move goes through salesApi.moveLead, and the board is
 * disabled while that mutation is in flight so a fast second drag cannot race
 * the first and leave the two out of sync.
 *
 * On the update strategy: the mutation is pessimistic rather than optimistic.
 * The obvious argument for optimistic here is that the whole point of dragging
 * a card is to watch it land. But an optimistic move has to be rolled back by
 * hand when it fails, and a card that slides to the next column and then snaps
 * back is a worse experience than one that waits. The mock round trip is
 * instant, so the cost of being correct is invisible.
 */

import { useMemo } from 'react';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import KanbanBoard from '../components/KanbanBoard';
import PipelineSummary from '../components/PipelineSummary';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import { useGetLeadsQuery, useMoveLeadMutation } from '../api/salesApi';
import { LEAD_STAGES } from '@/config/constants';
import { useNotify } from '@/hooks/useNotification';
import { daysBetween } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';
import './SalesPipelinePage.css';

/** Whole days since a timestamp, as a non-negative integer. */
function daysSince(value) {
  if (!value) return null;
  const days = daysBetween(value, new Date());
  return Number.isFinite(days) ? Math.max(0, Math.round(days)) : null;
}

export default function SalesPipelinePage() {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetLeadsQuery();
  const [moveLead, { isLoading: isMoving }] = useMoveLeadMutation();
  const notify = useNotify();

  /* RTK Query list endpoints return a paginated envelope. `items` is the real
     key; the `?? data` fallback keeps the board working if a query ever
     resolves to a bare array. */
  const leads = useMemo(() => data?.items ?? [], [data]);
  const currency = data?.currency ?? 'NGN';

  /* Group the flat lead list into the board's column shape.
     `lastContactDays` is derived here rather than stored on the lead: the
     fixture carries `updatedAt`, and the board's only need is a day count to
     flag stale cards. Deriving it in the view keeps the lead model clean. */
  const columns = useMemo(
    () =>
      LEAD_STAGES.map(({ id, label }) => ({
        id,
        label,
        leads: leads
          .filter((lead) => lead.stage === id)
          .map((lead) => ({ ...lead, lastContactDays: daysSince(lead.updatedAt) })),
      })),
    [leads],
  );

  const handleMove = async (leadId, toStageId) => {
    const fromStage = LEAD_STAGES.find((stage) => stage.id === columns.find((c) => c.leads.some((l) => l.id === leadId))?.id);

    try {
      await moveLead({ id: leadId, stage: toStageId }).unwrap();
      notify.success(`Moved to ${LEAD_STAGES.find((s) => s.id === toStageId)?.label ?? toStageId}`, {
        message: fromStage ? `Moved from ${fromStage.label}.` : undefined,
      });
    } catch {
      notify.error('Could not move that lead', {
        message: 'The stage was not changed. Try again.',
      });
    }
  };

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing pipeline');
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Sales</span>
          <h1 className="page__title">Pipeline</h1>
          <p className="page__subtitle">
            Drag a lead between stages, or focus a card and press Enter to pick it up, then use the
            arrow keys. Won and lost stay on the board so the full funnel remains readable.
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh pipeline"
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />}>
            New lead
          </Button>
        </div>
      </div>

      <div className="page__body">
        {isError ? (
          <Card padding="md">
            <div className="nx-pipeline__error">
              <h2 className="nx-pipeline__error-title">Could not load the pipeline</h2>
              <p className="nx-pipeline__error-text">
                {error?.data?.message ?? 'The lead list is unavailable right now.'}
              </p>
              <Button onClick={refetch}>Try again</Button>
            </div>
          </Card>
        ) : isLoading ? (
          <>
            <PipelineSummary columns={[]} currency={currency} />
            <div className="nx-pipeline__board">
              <LoadingState mode="skeleton" variant="card" rows={4} label="Loading pipeline" />
            </div>
          </>
        ) : leads.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={<FiPlus size={22} />}
              title="No leads yet"
              description="Add your first lead to start tracking the pipeline. New leads start in the New Lead stage."
            />
          </Card>
        ) : (
          <>
            <PipelineSummary columns={columns} currency={currency} />

            {/* The whole board dims while a move is committing, so it is obvious
                the drop registered but has not been saved yet. */}
            <div className="nx-pipeline__board" data-busy={isMoving || undefined}>
              <KanbanBoard columns={columns} onMove={handleMove} disabled={isMoving} />
            </div>

            <p className="nx-pipeline__foot">
              {leads.length} {leads.length === 1 ? 'lead' : 'leads'} totalling{' '}
              {formatCurrency(
                leads.reduce((sum, lead) => sum + (lead.value ?? 0), 0),
                { currency, compact: true },
              )}{' '}
              across {LEAD_STAGES.length} stages.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
