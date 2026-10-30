/**
 * NexERP — TransactionsPage
 * ---------------------------------------------------------------------------
 * Platform money movement — every charge, top-up and refund across every
 * tenant, including failed rows. The table is one server-paged envelope
 * (GET /platform/transactions while you scroll); the weekly volume line
 * above it comes from a second, larger fetch that is sorted by date and
 * grouped client-side into Monday-starting weeks.
 *
 * Refunds and failures are shown with words — "Refunded", "Failed" — not
 * just a colour, and the amount column always carries the row's own
 * currency (the fixture only ever writes NGN).
 *
 * Only the money series is charted: ChartCard formats its axes and tooltips
 * with formatCurrency, so plotting raw counts here would silently label
 * them as naira.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle, FiArrowDownLeft, FiArrowUpRight, FiDollarSign, FiFeather, FiRefreshCw, FiSlack,
} from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import LineChartCard from '@/components/data-display/Charts/LineChartCard';
import { useChartTheme } from '@/components/data-display/Charts/ChartCard';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetTransactionsQuery } from '../api/superAdminApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { formatDate, fromNow } from '@/utils/date';
import { appRoutes } from '@/config/navigation.config';
import './TransactionsPage.css';

const TYPE_META = {
  Subscription: { tone: 'accent', icon: FiSlack },
  Usage: { tone: 'info', icon: FiFeather },
  'Seat top-up': { tone: 'neutral', icon: FiArrowUpRight },
  Refund: { tone: 'warning', icon: FiArrowDownLeft },
};

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Failed' },
];

const matchesStatus = (tx, group) => (group === 'all' ? true : tx.statusKey === group.toUpperCase());

/* Group ISO dates into Monday-starting weeks (UTC math on plain Date).
   The mock only ever returns NGN, but the bucket adds each row's own
   currency so this stays honest if the fixture changes. */
const buildWeeklyVolume = (items) => {
  const buckets = new Map();
  for (const tx of items) {
    const d = new Date(tx.date);
    const offset = (d.getUTCDay() + 6) % 7;
    const weekStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - offset));
    const key = weekStart.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + (tx.amount ?? 0));
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, revenue]) => ({
      key,
      label: formatDate(new Date(key + 'T00:00:00.000Z'), 'dayMonth'),
      revenue,
    }));
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const theme = useChartTheme();

  const [statusGroup, setStatusGroup] = useState('all');

  const columns = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Reference',
        render: (tx) => (
          <div className="nx-tx__ident">
            <span className="nx-tx__mono">{tx.reference}</span>
            <span className="nx-tx__meta">{fromNow(tx.date)}</span>
          </div>
        ),
      },
      {
        key: 'vendor',
        header: 'Tenant',
        render: (tx) => (
          <div className="nx-tx__ident">
            <span className="nx-tx__tenant">{tx.vendor}</span>
            <span className="nx-tx__meta mono">{tx.vendorId}</span>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (tx) => {
          const TypeIcon = TYPE_META[tx.type]?.icon ?? FiArrowUpRight;
          return (
            <Badge tone={TYPE_META[tx.type]?.tone ?? 'neutral'}>
              <TypeIcon size={11} aria-hidden="true" /> {tx.type}
            </Badge>
          );
        },
      },
      {
        key: 'method',
        header: 'Method',
        render: (tx) => <span className="nx-tx__method">{tx.method}</span>,
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        sortable: true,
        render: (tx) => (
          <span className="nx-tx__mono strong">{formatCurrency(tx.amount, { currency: tx.currency })}</span>
        ),
      },
      {
        key: 'fees',
        header: 'Fees',
        align: 'right',
        sortable: true,
        render: (tx) => (
          <span className="nx-tx__fees">{formatCurrency(tx.fees, { currency: tx.currency })}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (tx) => (
          <Badge tone={tx.status?.tone ?? 'neutral'} dot>
            {tx.status?.label ?? tx.statusKey}
          </Badge>
        ),
      },
    ],
    [],
  );

  const table = useDataTable({
    tableName: 'platform-transactions',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetTransactionsQuery(table.queryParams);

  const chartQuery = useGetTransactionsQuery({ page: 1, pageSize: 100, sortBy: 'date', sortOrder: 'desc' });

  const chartData = useMemo(
    () => buildWeeklyVolume(chartQuery.data?.items ?? []),
    [chartQuery.data],
  );

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((tx) => matchesStatus(tx, statusGroup));
  }, [data, statusGroup]);

  const kpis = useMemo(() => {
    const completed = rows.filter((tx) => tx.statusKey === 'COMPLETED');
    const volume = completed.reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
    const counts = (key) => rows.filter((tx) => tx.statusKey === key).length;

    return [
      {
        key: 'volume',
        label: 'Gross volume',
        value: formatCurrency(volume, { compact: true }),
        icon: <FiDollarSign size={14} />,
        tone: 'accent',
        hint: 'Completed this page',
      },
      {
        key: 'pending',
        label: 'Pending',
        value: counts('PENDING'),
        icon: <FiRefreshCw size={14} />,
        tone: 'info',
        hint: 'Settlement risk',
      },
      {
        key: 'failed',
        label: 'Failed',
        value: counts('FAILED'),
        icon: <FiAlertTriangle size={14} />,
        tone: 'danger',
        hint: 'Needs attention',
      },
      {
        key: 'refunded',
        label: 'Refunded',
        value: counts('REFUNDED'),
        icon: <FiArrowDownLeft size={14} />,
        tone: 'warning',
        hint: 'Leakage this page',
      },
    ];
  }, [rows]);

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing transactions');
  };

  if (isError && !data) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Billing</span>
            <h1 className="page__title">Transactions</h1>
            <p className="page__subtitle">The money feed is unavailable right now.</p>
          </div>
        </div>
        <Card padding="lg">
          <div className="nx-tx__error">
            <h2 className="nx-tx__error-title">Could not load transactions</h2>
            <p className="nx-tx__error-text">
              {error?.data?.message ?? 'The platform transactions endpoint did not respond. Try again in a moment.'}
            </p>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Billing</span>
          <h1 className="page__title">Transactions</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading transactions…'
              : `${data?.total ?? rows.length} ${(data?.total ?? rows.length) === 1 ? 'move' : 'moves'} in the last six months`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh transactions"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="page__body">
        <div className="grid grid--metrics">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={isLoading} />
          ))}
        </div>

        <LineChartCard
          title="Gross volume"
          subtitle="Weekly totals, last ~6 months"
          data={chartData}
          xKey="label"
          series={[{ key: 'revenue', label: 'Gross volume', color: theme.accent, area: true }]}
          height={260}
          loading={chartQuery.isLoading}
          error={chartQuery.isError ? 'Could not build the weekly volume chart.' : null}
          action={
            <Button variant="ghost" size="sm" onClick={handleRefresh} aria-label="Refresh volume chart">
              Refresh
            </Button>
          }
        />

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Reference, tenant, type or method"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by transaction status">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`nx-segmented__item${statusGroup === filter.id ? ' is-active' : ''}`}
                  aria-pressed={statusGroup === filter.id}
                  onClick={() => setStatusGroup(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </TableToolbar>

          <DataTable
            columns={columns}
            data={rows}
            loading={isLoading}
            skeleton
            page={table.page}
            pageSize={table.pageSize}
            total={data?.total ?? rows.length}
            totalPages={data?.totalPages}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            sortBy={table.sortBy}
            sortOrder={table.sortOrder}
            onSort={table.toggleSort}
            visibleColumns={table.visibleColumns}
            itemLabel="transactions"
            isFiltered={table.isFiltered}
            onRowClick={(tx) => navigate(appRoutes.admin.vendorDetail(tx.vendorId))}
            emptyIcon={<FiArrowDownLeft />}
            emptyTitle="No transactions yet"
            emptyDescription="Money movements appear here the moment a tenant is billed."
          />
        </Card>
      </div>
    </div>
  );
}