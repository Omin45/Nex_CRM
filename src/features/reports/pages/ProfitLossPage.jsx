/**
 * NexERP — ProfitLossPage
 * ---------------------------------------------------------------------------
 * Four headline numbers, a period comparison chart, and the statement itself.
 *
 * The period selector changes labels only: the mock serves one canned P&L
 * regardless of params, so the request stays param-free until the backend
 * accepts a range. The header always says which period the figures are for.
 *
 * Every plotted figure also appears in the table below. Emphasis rows are
 * tinted and bolded, not colour-coded; the change column carries its +/- sign.
 */

import { useMemo, useState } from 'react';
import { FiAlertCircle, FiDollarSign, FiPieChart, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import DataTable from '@/components/data-display/DataTable/DataTable';
import BarChartCard from '@/components/data-display/Charts/BarChartCard';
import { useChartTheme } from '@/components/data-display/Charts/ChartCard';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetProfitAndLossQuery } from '../api/reportsApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency, percentChange } from '@/utils/currency';
import './ProfitLossPage.css';

const PERIODS = [
  { id: 'quarter', label: 'This quarter' },
  { id: 'year', label: 'This year' },
  { id: 'last-year', label: 'Last year' },
];

/* Skeleton placeholder ids — stable, so keys never fall back to the index. */
const KPI_SLOTS = ['revenue', 'gross-profit', 'net-profit', 'net-margin'];

export default function ProfitLossPage() {
  const notify = useNotify();
  const { currency } = useTenant();
  const theme = useChartTheme();

  /* Period is label state only — see the header note about the mock. */
  const [period, setPeriod] = useState('quarter');

  const { data, isLoading, isFetching, isError, error, refetch } = useGetProfitAndLossQuery();

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? 'This period';

  /* Group markers are derived here, once, so the table renderer never has to
     look backwards through the array (which sorting would invalidate). */
  const rows = useMemo(() => {
    const lines = data?.lines ?? [];
    return lines.map((line, index) => ({
      ...line,
      id: `${line.group}-${line.label}`,
      showGroup: index === 0 || lines[index - 1].group !== line.group,
      change: (Number(line.current) || 0) - (Number(line.previous) || 0),
    }));
  }, [data]);

  const columns = useMemo(
    () => [
      {
        key: 'label',
        header: 'Line item',
        render: (line) => (
          <span className={`nx-pl__line${line.emphasis ? ' nx-pl__line--emphasis' : ''}`}>
            {line.showGroup ? <span className="nx-pl__group">{line.group}</span> : null}
            <span className="nx-pl__name">{line.label}</span>
          </span>
        ),
      },
      {
        key: 'current',
        header: 'Current',
        align: 'right',
        render: (line) => (
          <span className="nx-pl__num nx-pl__num--strong">{formatCurrency(line.current, { currency })}</span>
        ),
      },
      {
        key: 'previous',
        header: 'Previous',
        align: 'right',
        render: (line) => <span className="nx-pl__num">{formatCurrency(line.previous, { currency })}</span>,
      },
      {
        /* Absolute change, signed as text — colour would say nothing a reader
           could not already see, and "up" is not always "good" on a P&L. */
        key: 'change',
        header: 'Change',
        align: 'right',
        render: (line) => (
          <span className="nx-pl__num">{formatCurrency(line.change, { currency, sign: 'always' })}</span>
        ),
      },
    ],
    [currency],
  );

  const kpis = useMemo(() => {
    const revenue = data?.revenue ?? {};
    const gross = data?.grossProfit ?? {};
    const net = data?.netProfit ?? {};

    const margin = revenue.current ? ((Number(net.current) || 0) / revenue.current) * 100 : 0;
    const previousMargin = revenue.previous
      ? ((Number(net.previous) || 0) / revenue.previous) * 100
      : 0;

    return [
      {
        key: 'revenue',
        label: 'Revenue',
        value: formatCurrency(revenue.current, { currency, compact: true }),
        delta: percentChange(revenue.current, revenue.previous),
        hint: 'vs previous period',
        icon: <FiDollarSign size={14} />,
        tone: 'accent',
      },
      {
        key: 'grossProfit',
        label: 'Gross profit',
        value: formatCurrency(gross.current, { currency, compact: true }),
        delta: percentChange(gross.current, gross.previous),
        hint: 'vs previous period',
        icon: <FiTrendingUp size={14} />,
        tone: 'success',
      },
      {
        key: 'netProfit',
        label: 'Net profit',
        value: formatCurrency(net.current, { currency, compact: true }),
        delta: percentChange(net.current, net.previous),
        hint: 'vs previous period',
        icon: <FiPieChart size={14} />,
        tone: 'violet',
      },
      {
        key: 'margin',
        label: 'Net margin',
        value: `${margin.toFixed(1)}%`,
        /* Percentage-point difference, not a ratio of ratios. */
        delta: Math.round((margin - previousMargin) * 10) / 10,
        hint: 'vs previous period',
        icon: <FiTrendingUp size={14} />,
        tone: 'accent',
      },
    ];
  }, [data, currency]);

  const chartData = useMemo(
    () =>
      data
        ? [
            { name: 'Revenue', current: data.revenue.current, previous: data.revenue.previous },
            {
              name: 'Cost of goods sold',
              current: data.costOfGoodsSold.current,
              previous: data.costOfGoodsSold.previous,
            },
            { name: 'Net profit', current: data.netProfit.current, previous: data.netProfit.previous },
          ]
        : [],
    [data],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing profit & loss');
  };

  if (isError) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">
              <FiAlertCircle size={12} /> Report unavailable
            </span>
            <h1 className="page__title">Profit &amp; loss</h1>
            <p className="page__subtitle">
              {error?.data?.message ?? 'The profit and loss statement could not be loaded.'}
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

  const isEmpty = !isLoading && !data;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Insight</span>
          <h1 className="page__title">Profit &amp; loss</h1>
          <p className="page__subtitle">
            {periodLabel}, compared with the period before it.
          </p>
        </div>
        <div className="page__actions">
          <div className="nx-segmented" role="group" aria-label="Reporting period">
            {PERIODS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`nx-segmented__item${period === option.id ? ' is-active' : ''}`}
                aria-pressed={period === option.id}
                onClick={() => setPeriod(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh profit and loss"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="page__body">
        {isLoading ? (
          <div className="grid grid--4">
            {KPI_SLOTS.map((slot) => (
              <Card key={slot} padding="md">
                <LoadingState mode="skeleton" variant="detail" rows={1} />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid--4">
            {kpis.map(({ key, ...kpi }) => (
              <MetricCard key={key} {...kpi} />
            ))}
          </div>
        )}

        {isEmpty ? (
          <Card padding="lg">
            <EmptyState
              icon={<FiTrendingUp />}
              title="No profit and loss data yet"
              description="Once the period closes, the statement will appear here."
              action={<Button onClick={refetch}>Reload</Button>}
            />
          </Card>
        ) : (
          <>
            {/* Text alternative first, so the summary exists even if the chart
                never paints. The table below repeats every plotted figure. */}
            {data ? (
              <p className="sr-only">
                Bar chart, current versus previous period: revenue{' '}
                {formatCurrency(data.revenue.current, { currency })} against{' '}
                {formatCurrency(data.revenue.previous, { currency })}; cost of goods sold{' '}
                {formatCurrency(data.costOfGoodsSold.current, { currency })} against{' '}
                {formatCurrency(data.costOfGoodsSold.previous, { currency })}; net profit{' '}
                {formatCurrency(data.netProfit.current, { currency })} against{' '}
                {formatCurrency(data.netProfit.previous, { currency })}. The same figures are listed
                in the statement table below.
              </p>
            ) : null}

            <BarChartCard
              title="Revenue, cost of goods sold and net profit"
              subtitle={`Current vs previous — ${periodLabel.toLowerCase()}`}
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

            <Card padding="none">
              <Card.Header
                title="Statement lines"
                subtitle={`Current, previous and absolute change — ${periodLabel.toLowerCase()}`}
              />
              <DataTable
                columns={columns}
                data={rows}
                loading={isLoading}
                rowKey={(line) => line.id}
                rowClassName={(line) => (line.emphasis ? 'nx-pl__row--emphasis' : '')}
                hidePagination
                dense
                caption="Profit and loss statement lines: current period, previous period and absolute change"
                emptyTitle="No lines in this period"
                emptyDescription="The statement has no rows for the selected period."
              />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
