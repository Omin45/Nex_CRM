/**
 * ArkCRM — SubscriptionsPage
 * ---------------------------------------------------------------------------
 * Billing desk view of every tenant's plan: what they pay, how many seats
 * they use, and what is about to renew. One row per tenant, served by
 * GET /platform/subscriptions with the usual `{ items, total }` envelope.
 *
 * The seats column is a native <progress> element on top of a "used of
 * total" label, so the ratio carries words rather than relying on a bar's
 * length or colour alone.
 *
 * Pages that market a monthly figure show it in the platform session's
 * home currency (NGN) and never try to convert it: the fixture's
 * subscriptions carry no `currency` field, and inventing cross-currency
 * math here would only manufacture nonsense.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity, FiAlertTriangle, FiCalendar, FiClock, FiCreditCard, FiDollarSign, FiRefreshCw, FiRepeat,
} from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetSubscriptionsQuery } from '../api/superAdminApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { appRoutes } from '@/config/navigation.config';
import './SubscriptionsPage.css';
import { serverMessage } from '@/utils/errorMessage';

const PLAN_META = {
  STARTER: { label: 'Starter', tone: 'neutral' },
  GROWTH: { label: 'Growth', tone: 'info' },
  SCALE: { label: 'Scale', tone: 'accent' },
  ENTERPRISE: { label: 'Enterprise', tone: 'violet' },
};

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'trialing', label: 'Trialing' },
  { id: 'overdue', label: 'Overdue' },
];

const matchesStatus = (row, filter) => {
  if (filter === 'all') return true;
  if (filter === 'trialing') return row.statusKey === 'TRIALING';
  if (filter === 'overdue') return row.statusKey === 'PAST_DUE';
  return row.statusKey === 'ACTIVE';
};

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const [statusGroup, setStatusGroup] = useState('all');

  const columns = useMemo(
    () => [
      {
        key: 'vendor',
        header: 'Tenant',
        render: (row) => (
          <div className="nx-subs__ident">
            <span className="nx-subs__tenant">{row.vendor}</span>
            <span className="nx-subs__meta mono">{row.id}</span>
          </div>
        ),
      },
      {
        key: 'plan',
        header: 'Plan',
        sortable: true,
        render: (row) => {
          const plan = PLAN_META[row.plan];
          return (
            <Badge tone={plan?.tone ?? 'neutral'}>
              {plan?.label ?? row.plan}
            </Badge>
          );
        },
      },
      {
        key: 'mrr',
        header: 'Monthly',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="nx-subs__mono">{formatCurrency(row.mrr)}</span>
        ),
      },
      {
        key: 'seatsUsed',
        header: 'Seats',
        sortable: true,
        render: (row) => {
          const share = row.seatsTotal > 0
            ? Math.round((row.seatsUsed / row.seatsTotal) * 100)
            : 0;
          return (
            <div className="nx-subs__seats">
              <div className="nx-subs__seats-head">
                <span className="nx-subs__meta">{row.seatsUsed} of {row.seatsTotal}</span>
                <span className="nx-subs__meta">{share}%</span>
              </div>
              <progress
                className="nx-subs__bar"
                max={row.seatsTotal}
                value={row.seatsUsed}
                aria-label={`Seats used: ${row.seatsUsed} of ${row.seatsTotal}`}
              />
            </div>
          );
        },
      },
      {
        key: 'billingCycle',
        header: 'Cycle',
        render: (row) => (
          <span className="nx-subs__cycle">
            <FiRepeat size={12} aria-hidden="true" />
            {row.billingCycle === 'MONTHLY' ? 'Monthly' : 'Annual'}
          </span>
        ),
      },
      {
        key: 'renewsAt',
        header: 'Renews',
        sortable: true,
        render: (row) => (
          <div className="nx-subs__renews">
            <FiCalendar size={12} aria-hidden="true" />
            <span>{formatDate(row.renewsAt, 'medium')}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge tone={row.status?.tone ?? 'neutral'} dot>
            {row.status?.label ?? row.statusKey}
          </Badge>
        ),
      },
    ],
    [],
  );

  const table = useDataTable({
    tableName: 'platform-subscriptions',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetSubscriptionsQuery(table.queryParams);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((row) => matchesStatus(row, statusGroup));
  }, [data, statusGroup]);

  const kpis = useMemo(() => {
    const mrr = rows.reduce((sum, row) => sum + (row.mrr ?? 0), 0);
    const active = rows.filter((row) => row.statusKey === 'ACTIVE').length;
    const trialing = rows.filter((row) => row.statusKey === 'TRIALING').length;
    const overdue = rows.filter((row) => row.statusKey === 'PAST_DUE').length;

    return [
      {
        key: 'mrr',
        label: 'Recurring',
        value: formatCurrency(mrr, { compact: true }),
        icon: <FiDollarSign size={14} />,
        tone: 'accent',
        hint: 'Page MRR',
      },
      {
        key: 'active',
        label: 'Active plans',
        value: active,
        icon: <FiActivity size={14} />,
        tone: 'success',
        hint: 'On this page',
      },
      {
        key: 'trialing',
        label: 'Trialing',
        value: trialing,
        icon: <FiClock size={14} />,
        tone: 'info',
        hint: 'Conversion risk',
      },
      {
        key: 'overdue',
        label: 'Past due',
        value: overdue,
        icon: <FiAlertTriangle size={14} />,
        tone: 'danger',
        hint: 'May churn next',
      },
    ];
  }, [rows]);

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing subscriptions');
  };

  if (isError && !data) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Billing</span>
            <h1 className="page__title">Subscriptions</h1>
            <p className="page__subtitle">The billing desk is unavailable right now.</p>
          </div>
        </div>
        <Card padding="lg">
          <div className="nx-subs__error">
            <h2 className="nx-subs__error-title">Could not load subscriptions</h2>
            <p className="nx-subs__error-text">
              {serverMessage(error, 'The platform subscriptions endpoint did not respond. Try again in a moment.')}
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
          <h1 className="page__title">Subscriptions</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading subscriptions…'
              : `${data?.total ?? rows.length} ${(data?.total ?? rows.length) === 1 ? 'plan' : 'plans'} earning revenue right now`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiCreditCard size={15} />}
            aria-label="Go to transactions"
            onClick={() => navigate(appRoutes.admin.transactions)}
          >
            Transactions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh subscriptions"
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

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Tenant, plan or payment method"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by subscription status">
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
            itemLabel="subscriptions"
            isFiltered={table.isFiltered}
            onRowClick={(row) => navigate(appRoutes.admin.vendorDetail(row.vendorId))}
            emptyIcon={<FiCreditCard />}
            emptyTitle={statusGroup === 'all' ? 'No subscriptions yet' : 'Nothing in this status'}
            emptyDescription="Subscription rows appear here the moment a tenant is created."
          />
        </Card>
      </div>
    </div>
  );
}