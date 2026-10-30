/**
 * NexERP — BalanceSheetPage
 * ---------------------------------------------------------------------------
 * Assets, liabilities and equity as three cards, plus a reconciliation strip
 * that says in words whether the sheet balances.
 *
 * The reconciliation is computed here, not trusted from the server: it exists
 * to catch a sheet that does not balance, so it cannot rest on the numbers it
 * checks. The gap is reported honestly — this mock's fixture is out by ₦1,000.
 *
 * The chart plots only section totals; each is printed in the cards above.
 */

import { useMemo } from 'react';
import {
  FiAlertCircle, FiBox, FiCheckCircle, FiCreditCard, FiLayers, FiRefreshCw, FiTrendingUp,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import BarChartCard from '@/components/data-display/Charts/BarChartCard';
import { useChartTheme } from '@/components/data-display/Charts/ChartCard';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import { useGetBalanceSheetQuery } from '../api/reportsApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import './BalanceSheetPage.css';

const SECTIONS = [
  {
    key: 'assets',
    title: 'Assets',
    blurb: 'What the business owns',
    totalLabel: 'Total assets',
    icon: <FiBox size={15} />,
  },
  {
    key: 'liabilities',
    title: 'Liabilities',
    blurb: 'What the business owes',
    totalLabel: 'Total liabilities',
    icon: <FiCreditCard size={15} />,
  },
  {
    key: 'equity',
    title: 'Equity',
    blurb: 'What is left for the owners',
    totalLabel: 'Total equity',
    icon: <FiTrendingUp size={15} />,
  },
];

/* Skeleton keys reuse the section ids — no index keys anywhere on the page. */
const SECTION_SLOTS = SECTIONS.map((section) => section.key);

/** One column of the sheet: a small figures table with a totals row. */
function SectionCard({ section, rows, totals, currency }) {
  return (
    <Card padding="md" className="nx-bs__card">
      <Card.Header title={section.title} subtitle={section.blurb} icon={section.icon} />
      <Card.Body>
        {rows.length === 0 ? (
          <p className="nx-bs__empty">No accounts in this section yet.</p>
        ) : (
          <table className="nx-bs__table">
            <caption className="sr-only">
              {section.title}: current and previous period balances
            </caption>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col" className="nx-bs__col">Current</th>
                <th scope="col" className="nx-bs__col">Previous</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="nx-bs__rowhead">
                    {row.label}
                  </th>
                  <td className="nx-bs__col">{formatCurrency(row.current, { currency })}</td>
                  <td className="nx-bs__col nx-bs__col--prev">
                    {formatCurrency(row.previous, { currency })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{section.totalLabel}</th>
                <td className="nx-bs__col nx-bs__col--total">
                  {formatCurrency(totals.current, { currency })}
                </td>
                <td className="nx-bs__col nx-bs__col--total nx-bs__col--prev">
                  {formatCurrency(totals.previous, { currency })}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card.Body>
    </Card>
  );
}

export default function BalanceSheetPage() {
  const notify = useNotify();
  const { currency } = useTenant();
  const theme = useChartTheme();

  const { data, isLoading, isFetching, isError, error, refetch } = useGetBalanceSheetQuery();

  /* Section sums — the reconciliation strip reads from these, never from a
     server-provided total, so an unbalanced sheet cannot self-certify. */
  const totals = useMemo(() => {
    const sum = (rows, field) =>
      (rows ?? []).reduce((acc, row) => acc + (Number(row[field]) || 0), 0);

    const assets = {
      current: sum(data?.assets, 'current'),
      previous: sum(data?.assets, 'previous'),
    };
    const liabilities = {
      current: sum(data?.liabilities, 'current'),
      previous: sum(data?.liabilities, 'previous'),
    };
    const equity = {
      current: sum(data?.equity, 'current'),
      previous: sum(data?.equity, 'previous'),
    };
    const obligations = {
      current: liabilities.current + equity.current,
      previous: liabilities.previous + equity.previous,
    };
    const gap = {
      current: assets.current - obligations.current,
      previous: assets.previous - obligations.previous,
    };

    return {
      assets,
      liabilities,
      equity,
      obligations,
      gap,
      /* Sub-naira drift is float noise; anything real is reported. */
      balanced: Math.abs(gap.current) < 0.5,
    };
  }, [data]);

  const chartData = useMemo(
    () =>
      data
        ? [
            { name: 'Assets', current: totals.assets.current, previous: totals.assets.previous },
            {
              name: 'Liabilities',
              current: totals.liabilities.current,
              previous: totals.liabilities.previous,
            },
            { name: 'Equity', current: totals.equity.current, previous: totals.equity.previous },
          ]
        : [],
    [data, totals],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing balance sheet');
  };

  if (isError) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">
              <FiAlertCircle size={12} /> Report unavailable
            </span>
            <h1 className="page__title">Balance sheet</h1>
            <p className="page__subtitle">
              {error?.data?.message ?? 'The balance sheet could not be loaded.'}
            </p>
          </div>
          <div className="page__actions">
            <Button leftIcon={<FiRefreshCw size={15} />} onClick={refetch}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* A response with three empty arrays is still "nothing to show" — the
     reconciliation strip would otherwise declare ₦0 = ₦0 a balanced sheet. */
  const isEmpty =
    !isLoading &&
    (!data ||
      (data.assets?.length ?? 0) +
        (data.liabilities?.length ?? 0) +
        (data.equity?.length ?? 0) ===
        0);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Insight</span>
          <h1 className="page__title">Balance sheet</h1>
          <p className="page__subtitle">
            What the business owns, what it owes, and what is left — at the latest close.
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh balance sheet"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="page__body">
        {isLoading ? (
          <>
            <Card padding="md">
              <LoadingState mode="skeleton" variant="detail" rows={1} />
            </Card>
            <div className="grid grid--3">
              {SECTION_SLOTS.map((slot) => (
                <Card key={slot} padding="md">
                  <LoadingState mode="skeleton" variant="detail" rows={3} />
                </Card>
              ))}
            </div>
          </>
        ) : isEmpty ? (
          <Card padding="lg">
            <EmptyState
              icon={<FiLayers />}
              title="No balance sheet yet"
              description="Once accounts are posted for the period, the sheet will appear here."
              action={<Button onClick={refetch}>Reload</Button>}
            />
          </Card>
        ) : (
          <>
            {/* The reconciliation strip: figures and verdict in words, so the
                yes/no answer never depends on reading a chart. */}
            <div
              className={`nx-alert ${totals.balanced ? 'nx-alert--success' : 'nx-alert--warning'}`}
              role="status"
            >
              <span className="nx-alert__icon" aria-hidden="true">
                {totals.balanced ? <FiCheckCircle /> : <FiAlertCircle />}
              </span>
              <span className="nx-bs__recon">
                <strong className="nx-bs__recon-head">
                  {totals.balanced ? 'This period balances' : 'This period does not balance'}
                </strong>
                <span className="nx-bs__recon-text">
                  Total assets {formatCurrency(totals.assets.current, { currency })} vs liabilities{' '}
                  {formatCurrency(totals.liabilities.current, { currency })} + equity{' '}
                  {formatCurrency(totals.equity.current, { currency })}
                  {totals.balanced
                    ? ' — the two sides are equal.'
                    : ` — out by ${formatCurrency(Math.abs(totals.gap.current), { currency })}, with ${
                        totals.gap.current > 0 ? 'assets higher' : 'liabilities and equity higher'
                      }.`}
                </span>
              </span>
            </div>

            <div className="grid grid--3">
              {SECTIONS.map((section) => (
                <SectionCard
                  key={section.key}
                  section={section}
                  rows={data[section.key] ?? []}
                  totals={totals[section.key]}
                  currency={currency}
                />
              ))}
            </div>

            <p className="sr-only">
              Bar chart of section totals, current versus previous period: assets{' '}
              {formatCurrency(totals.assets.current, { currency })} against{' '}
              {formatCurrency(totals.assets.previous, { currency })}; liabilities{' '}
              {formatCurrency(totals.liabilities.current, { currency })} against{' '}
              {formatCurrency(totals.liabilities.previous, { currency })}; equity{' '}
              {formatCurrency(totals.equity.current, { currency })} against{' '}
              {formatCurrency(totals.equity.previous, { currency })}. The same figures, with
              account-level detail, are listed in the cards above.
            </p>

            <BarChartCard
              title="Section totals"
              subtitle="Current vs previous period"
              data={chartData}
              xKey="name"
              series={[
                { key: 'current', label: 'Current period', color: theme.accent },
                { key: 'previous', label: 'Previous period', color: theme.indigo },
              ]}
              currency={currency}
              height={280}
              showLegend
              loading={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}
