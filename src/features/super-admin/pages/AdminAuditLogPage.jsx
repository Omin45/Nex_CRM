/**
 * ArkCRM — AdminAuditLogPage
 * ---------------------------------------------------------------------------
 * The immutable cross-tenant audit trail: every sign-in, plan change,
 * export and permission edit an operator might need to chase, served by
 * GET /platform/audit-log. Read-only on purpose — if a rule needs to be
 * undone, the fix is a new action, not editing the log.
 *
 * Severities are filtered locally (four slots — All, Critical, Warning,
 * Info) while search, sort and paging run on the server. The ambiguity an
 * audit desk cares about is "what did this person do" — so the action gets
 * a category label *and* a written description, and severity always pairs
 * its colour with a word.
 *
 * Clicking a row takes you to the tenant it happened in.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertOctagon, FiAlertTriangle, FiClock, FiInfo, FiRefreshCw, FiShield,
} from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetPlatformAuditLogQuery } from '../api/superAdminApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { formatDateTime, fromNow } from '@/utils/date';
import { appRoutes } from '@/config/navigation.config';
import './AdminAuditLogPage.css';
import { serverMessage } from '@/utils/errorMessage';

const SEVERITY_META = {
  critical: { tone: 'danger', icon: FiAlertOctagon },
  warning: { tone: 'warning', icon: FiAlertTriangle },
  info: { tone: 'info', icon: FiInfo },
};

const SEVERITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'warning', label: 'Warning' },
  { id: 'info', label: 'Info' },
];

const matchesSeverity = (row, group) => (group === 'all' ? true : row.severity === group);

const DAY = 86_400_000;

export default function AdminAuditLogPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const [severityGroup, setSeverityGroup] = useState('all');

  const columns = useMemo(
    () => [
      {
        key: 'action',
        header: 'Event',
        render: (row) => (
          <div className="nx-audit__event">
            <span className="nx-audit__category">{row.category}</span>
            <span className="nx-audit__action">{row.action}</span>
          </div>
        ),
      },
      {
        key: 'actor',
        header: 'Actor',
        render: (row) => (
          <div className="nx-audit__ident">
            <span className="nx-audit__name">{row.actor}</span>
            <span className="nx-audit__meta">{row.actorEmail}</span>
          </div>
        ),
      },
      {
        key: 'tenant',
        header: 'Tenant',
        render: (row) => (
          <div className="nx-audit__ident">
            <span className="nx-audit__name">{row.tenant}</span>
            <span className="nx-audit__meta mono">{row.tenantId}</span>
          </div>
        ),
      },
      {
        key: 'severity',
        header: 'Severity',
        render: (row) => {
          const meta = SEVERITY_META[row.severity];
          const SeverityIcon = meta?.icon ?? FiInfo;
          return (
            <Badge tone={meta?.tone ?? 'neutral'} dot>
              <SeverityIcon size={11} aria-hidden="true" /> {row.severityLabel ?? row.severity}
            </Badge>
          );
        },
      },
      {
        key: 'timestamp',
        header: 'When',
        align: 'right',
        sortable: true,
        render: (row) => (
          <div className="nx-audit__when">
            <span>{formatDateTime(row.timestamp)}</span>
            <span className="nx-audit__meta">{fromNow(row.timestamp)}</span>
          </div>
        ),
      },
      {
        key: 'origin',
        header: 'Origin',
        render: (row) => (
          <div className="nx-audit__ident">
            <span className="nx-audit__meta mono">{row.ip}</span>
            <span className="nx-audit__meta">{row.userAgent}</span>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useDataTable({
    tableName: 'platform-audit-log',
    columns,
    initialPageSize: 20,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetPlatformAuditLogQuery(table.queryParams);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((row) => matchesSeverity(row, severityGroup));
  }, [data, severityGroup]);

  const kpis = useMemo(() => {
    const counts = (severity) => rows.filter((row) => row.severity === severity).length;
    const lastWeek = rows.filter((row) => Date.now() - new Date(row.timestamp).getTime() <= 7 * DAY).length;

    return [
      {
        key: 'critical',
        label: 'Critical',
        value: counts('critical'),
        icon: <FiAlertOctagon size={14} />,
        tone: 'danger',
        hint: 'Needs review now',
      },
      {
        key: 'warning',
        label: 'Warning',
        value: counts('warning'),
        icon: <FiAlertTriangle size={14} />,
        tone: 'warning',
        hint: 'Worth a look',
      },
      {
        key: 'info',
        label: 'Info',
        value: counts('info'),
        icon: <FiInfo size={14} />,
        tone: 'info',
        hint: 'Routine activity',
      },
      {
        key: 'week',
        label: 'Last 7 days',
        value: lastWeek,
        icon: <FiClock size={14} />,
        tone: 'accent',
        hint: 'From this page',
      },
    ];
  }, [rows]);

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing audit log');
  };

  if (isError && !data) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Security</span>
            <h1 className="page__title">Audit log</h1>
            <p className="page__subtitle">The audit trail is unavailable right now.</p>
          </div>
        </div>
        <Card padding="lg">
          <div className="nx-audit__error">
            <h2 className="nx-audit__error-title">Could not load the audit log</h2>
            <p className="nx-audit__error-text">
              {serverMessage(error, 'The platform audit-log endpoint did not respond. Try again in a moment.')}
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
          <span className="page__eyebrow">Security</span>
          <h1 className="page__title">Audit log</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading the audit trail…'
              : `${data?.total ?? rows.length} ${(data?.total ?? rows.length) === 1 ? 'event' : 'events'} across every tenant`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiShield size={15} />}
            aria-label="Open tenant for a system health check"
            onClick={() => navigate(appRoutes.admin.system)}
          >
            System health
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh audit log"
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
            searchPlaceholder="Actor, action, category, tenant or IP"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by severity">
              {SEVERITY_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`nx-segmented__item${severityGroup === filter.id ? ' is-active' : ''}`}
                  aria-pressed={severityGroup === filter.id}
                  onClick={() => setSeverityGroup(filter.id)}
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
            itemLabel="events"
            isFiltered={table.isFiltered}
            onRowClick={(row) => navigate(appRoutes.admin.vendorDetail(row.tenantId))}
            emptyIcon={<FiShield />}
            emptyTitle={severityGroup === 'all' ? 'No events logged yet' : 'Nothing at this severity'}
            emptyDescription="The audit trail is written as soon as a protected action happens anywhere in the platform."
          />
        </Card>
      </div>
    </div>
  );
}