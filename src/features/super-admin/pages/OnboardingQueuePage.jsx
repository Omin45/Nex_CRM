/**
 * NexERP — OnboardingQueuePage
 * ---------------------------------------------------------------------------
 * Every tenant still making its way to go-live, with the step they are on,
 * who owns the migration, what is blocking it, and when it is due. Served
 * by GET /platform/onboarding; a tenant can be advanced one step at a time
 * from the tenant detail page, which is where the strip is interactive.
 *
 * Progress here is written twice: as a native <progress> bar *and* as a
 * "Step label — 40%" line. The queue is inspected by humans who are about
 * to email a customer about a delay; none of that works off colour alone.
 *
 * Blockers are their own vocabulary — listing them beat-for-beat, up to
 * two, with a "+n more" — so a row never hides the reason a tenant is
 * stuck behind a red dot.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertOctagon, FiCalendar, FiCheckCircle, FiClock, FiRefreshCw, FiUserCheck,
} from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetOnboardingQuery } from '../api/superAdminApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { formatDate, fromNow } from '@/utils/date';
import { appRoutes } from '@/config/navigation.config';
import './OnboardingQueuePage.css';

const DAY = 86_400_000;

const dueWithinDays = (iso, days) => {
  if (!iso) return false;
  return new Date(iso).getTime() - Date.now() <= days * DAY;
};

export default function OnboardingQueuePage() {
  const navigate = useNavigate();
  const notify = useNotify();

  const columns = useMemo(
    () => [
      {
        key: 'vendor',
        header: 'Tenant',
        render: (row) => (
          <div className="nx-onb__ident">
            <span className="nx-onb__tenant">{row.vendor}</span>
            <span className="nx-onb__meta">{row.contact} · {row.email}</span>
          </div>
        ),
      },
      {
        key: 'owner',
        header: 'Owner',
        render: (row) => (
          <span className="nx-onb__owner">
            <FiUserCheck size={12} aria-hidden="true" />
            {row.owner}
          </span>
        ),
      },
      {
        key: 'currentStep',
        header: 'Progress',
        sortable: true,
        render: (row) => (
          <div className="nx-onb__progress">
            <div className="nx-onb__progress-head">
              <span>{row.stepLabel}</span>
              <span className="nx-onb__pct">{row.progress}%</span>
            </div>
            <progress
              className="nx-onb__bar"
              max={100}
              value={row.progress}
              aria-label={`Onboarding ${row.progress}% complete, currently ${row.stepLabel}`}
            />
          </div>
        ),
      },
      {
        key: 'startedAt',
        header: 'Started',
        sortable: true,
        render: (row) => (
          <span className="nx-onb__when">{fromNow(row.startedAt)}</span>
        ),
      },
      {
        key: 'dueAt',
        header: 'Due',
        sortable: true,
        render: (row) => (
          <div className="nx-onb__due" data-soon={dueWithinDays(row.dueAt, 7) ? 'true' : undefined}>
            <FiCalendar size={12} aria-hidden="true" />
            <span>{formatDate(row.dueAt, 'medium')}</span>
            <span className="nx-onb__meta">{fromNow(row.dueAt)}</span>
          </div>
        ),
      },
      {
        key: 'blockers',
        header: 'Blockers',
        render: (row) => {
          const blockers = row.blockers ?? [];
          if (!blockers.length) {
            return <span className="nx-onb__none">None</span>;
          }
          return (
            <span className="nx-onb__blockers">
              {blockers.slice(0, 2).map((blocker) => (
                <Badge key={blocker} tone="warning" size="xs">{blocker}</Badge>
              ))}
              {blockers.length > 2 ? (
                <Badge tone="neutral" size="xs">+{blockers.length - 2} more</Badge>
              ) : null}
            </span>
          );
        },
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
    tableName: 'platform-onboarding',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetOnboardingQuery(table.queryParams);

  const rows = useMemo(() => data?.items ?? [], [data]);

  const kpis = useMemo(() => {
    const inProgress = rows.filter((row) => row.statusKey === 'IN_PROGRESS').length;
    const ready = rows.filter((row) => row.statusKey === 'READY').length;
    const blocked = rows.filter((row) => (row.blockers ?? []).length > 0).length;
    const closingSoon = rows.filter((row) => dueWithinDays(row.dueAt, 7)).length;

    return [
      {
        key: 'in-progress',
        label: 'In progress',
        value: inProgress,
        icon: <FiClock size={14} />,
        tone: 'info',
        hint: 'Mid-migration',
      },
      {
        key: 'ready',
        label: 'Ready to launch',
        value: ready,
        icon: <FiCheckCircle size={14} />,
        tone: 'success',
        hint: 'Waiting on go-live',
      },
      {
        key: 'blocked',
        label: 'Blocked',
        value: blocked,
        icon: <FiAlertOctagon size={14} />,
        tone: 'danger',
        hint: 'Has at least one blocker',
      },
      {
        key: 'closing',
        label: 'Due in 7 days',
        value: closingSoon,
        icon: <FiCalendar size={14} />,
        tone: 'warning',
        hint: 'Need to move fast',
      },
    ];
  }, [rows]);

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing onboarding queue');
  };

  if (isError && !data) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Platform</span>
            <h1 className="page__title">Onboarding queue</h1>
            <p className="page__subtitle">The queue is unavailable right now.</p>
          </div>
        </div>
        <Card padding="lg">
          <div className="nx-onb__error">
            <h2 className="nx-onb__error-title">Could not load the queue</h2>
            <p className="nx-onb__error-text">
              {error?.data?.message ?? 'The platform onboarding endpoint did not respond. Try again in a moment.'}
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
          <span className="page__eyebrow">Platform</span>
          <h1 className="page__title">Onboarding queue</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading the queue…'
              : `${data?.total ?? rows.length} ${(data?.total ?? rows.length) === 1 ? 'tenant' : 'tenants'} moving towards go-live`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh onboarding queue"
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
            searchPlaceholder="Vendor, contact, owner or step"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          />

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
            itemLabel="tenants"
            isFiltered={table.isFiltered}
            onRowClick={(row) => navigate(appRoutes.admin.vendorDetail(row.vendorId))}
            emptyIcon={<FiClock />}
            emptyTitle="The queue is empty"
            emptyDescription="Every tenant has crossed the go-live line, for now. New tenants appear here automatically."
          />
        </Card>
      </div>
    </div>
  );
}