/**
 * ArkCRM — CashFlowPage
 * ---------------------------------------------------------------------------
 * Cash movement in operating, investing and financing streams across the six
 * periods the mock returns.
 *
 * Net column and KPI totals are computed here, not fetched: the endpoint ships
 * raw streams only, and ending-period cash is the question the page answers.
 *
 * The chart shows shape; the table carries every figure and its six-period
 * total, so the chart is never the only copy of a number.
 */

import { useMemo } from 'react';
import {
  FiActivity, FiAlertCircle, FiArrowDownRight, FiArrowUpRight, FiCreditCard, FiDollarSign,
  FiRefreshCw,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import DataTable from '@/components/data-display/DataTable/DataTable';
import LineChartCard from '@/components/data-display/Charts/LineChartCard';
import { useChartTheme } from '@/components/data-display/Charts/ChartCard';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetCashFlowQuery } from '../api/reportsApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import './CashFlowPage.css';
import { serverMessage } from '@/utils/errorMessage';

/* Skeleton placeholder ids — stable, so keys never fall back to the index. */
const KPI_SLOTS = ['operating', 'investing', 'financing', 'net-movement'];

export default function CashFlowPage() {
  const notify = useNotify();
  const { currency } = useTenant();
  const theme = useChartTheme();

  const { data, isLoading, isFetching, isError, error, refetch } = useGetCashFlowQuery();

  /* One row per period, with the net movement derived client-side. The month
     label is stable across refetches, so it doubles as the row id. */
  const rows = useMemo(() => {
    const labels = data?.labels ?? [];
    return labels.map((label, index) => {
      const operating = Number(data.operating[index]) || 0;
      const investing = Number(data.investing[index]) || 0;
      const financing = Number(data.financing[index]) || 0;

      return {
        id: label,
        period: label,
        operating,
        investing,
        financing,
        net: operating + investing + financing,
      };
    });
  }, [data]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          operating: acc.operating + row.operating,
          investing: acc.investing + row.investing,
          financing: acc.financing + row.financing,
          net: acc.net + row.net,
        }),
        { operating: 0, investing: 0, financing: 0, net: 0 },
      ),
    [rows],
  );

  const kpis = useMemo(
    () => [
      {
        key: 'operating',
        label: 'Operating',
        value: formatCurrency(totals.operating, { currency, compact: true }),
        hint: 'Six-period total',
        icon: <FiArrowUpRight size={14} />,
        tone: 'success',
      },
      {
        key: 'investing',
        label: 'Investing',
        value: formatCurrency(totals.investing, { currency, compact: true }),
        hint: 'Six-period total',
        icon: <FiArrowDownRight size={14} />,
        tone: 'violet',
      },
      {
        key: 'financing',
        label: 'Financing',
        value: formatCurrency(totals.financing, { currency, compact: true }),
        hint: 'Six-period total',
        icon: <FiCreditCard size={14} />,
        tone: 'accent',
      },
      {
        key: 'net',
        label: 'Net cash movement',
        value: formatCurrency(totals.net, { currency, compact: true, sign: 'always' }),
        hint: 'Operating + investing + financing',
        icon: <FiDollarSign size={14} />,
        tone: totals.net >= 0 ? 'success' : 'danger',
      },
    ],
    [totals, currency],
  );

  const columns = useMemo(
    () => [
      { key: 'period', header: 'Period' },
      {
        key: 'operating',
        header: 'Operating',
        align: 'right',
        render: (row) => <span className="nx-cf__num">{formatCurrency(row.operating, { currency })}</span>,
      },
      {
        key: 'investing',
        header: 'Investing',
        align: 'right',
        render: (row) => <span className="nx-cf__num">{formatCurrency(row.investing, { currency })}</span>,
      },
      {
        key: 'financing',
        header: 'Financing',
        align: 'right',
        render: (row) => <span className="nx-cf__num">{formatCurrency(row.financing, { currency })}</span>,
      },
      {
        key: 'net',
        header: 'Net movement',
        align: 'right',
        render: (row) => (
          <span className="nx-cf__num nx-cf__num--net">
            {formatCurrency(row.net, { currency, sign: 'always' })}
          </span>
        ),
      },
    ],
    [currency],
  );

  const footer = rows.length ? (
    <tr className="nx-cf__foot">
      <th scope="row">Six-period total</th>
      <td>{formatCurrency(totals.operating, { currency })}</td>
      <td>{formatCurrency(totals.investing, { currency })}</td>
      <td>{formatCurrency(totals.financing, { currency })}</td>
      <td>{formatCurrency(totals.net, { currency, sign: 'always' })}</td>
    </tr>
  ) : null;

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing cash flow');
  };

  if (isError) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">
              <FiAlertCircle size={12} /> Report unavailable
            </span>
            <h1 className="page__title">Cash flow</h1>
            <p className="page__subtitle">
              {serverMessage(error, 'The cash flow statement could not be loaded.')}
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

  const isEmpty = !isLoading && rows.length === 0;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Insight</span>
          <h1 className="page__title">Cash flow</h1>
          <p className="page__subtitle">
            Where cash came from and where it went, across the last six periods.
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh cash flow"
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
              icon={<FiActivity />}
              title="No cash flow data yet"
              description="Once periods are closed, the statement will appear here."
              action={<Button onClick={refetch}>Reload</Button>}
            />
          </Card>
        ) : (
          <>
            {/* Summarised only once there are figures — a zeroed summary
                during the first load would be announced as fact. */}
            {rows.length ? (
              <p className="sr-only">
                Line chart of operating, investing and financing cash over{' '}
                {rows.length} periods. Six-period totals: operating{' '}
                {formatCurrency(totals.operating, { currency })}, investing{' '}
                {formatCurrency(totals.investing, { currency })}, financing{' '}
                {formatCurrency(totals.financing, { currency })}, net movement{' '}
                {formatCurrency(totals.net, { currency, sign: 'always' })}. Every period figure is
                listed in the table below.
              </p>
            ) : null}

            <LineChartCard
              title="Operating, investing and financing cash"
              subtitle="By period, with a zero line"
              data={rows}
              xKey="period"
              series={[
                { key: 'operating', label: 'Operating', color: theme.accent, area: true },
                { key: 'investing', label: 'Investing', color: theme.danger },
                { key: 'financing', label: 'Financing', color: theme.violet },
              ]}
              referenceLine={0}
              currency={currency}
              height={300}
              showLegend
              loading={isLoading}
            />

            <Card padding="none">
              <Card.Header
                title="Period detail"
                subtitle="Three streams per period, with net movement computed from them"
              />
              <DataTable
                columns={columns}
                data={rows}
                loading={isLoading}
                footer={footer}
                hidePagination
                dense
                caption="Cash flow by period: operating, investing and financing streams with net movement"
                emptyTitle="No periods to show"
                emptyDescription="Once cash flow periods are closed they will appear here."
              />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
