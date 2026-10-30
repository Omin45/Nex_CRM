/**
 * NexERP — SystemHealthPage
 * ---------------------------------------------------------------------------
 * Liveness of the platform, as the platform sees it: one aggregate status,
 * four live metrics, a per-service table and the open / recent incidents.
 * Served by GET /platform/system, which returns a single object (not an
 * envelope — there is nothing to paginate).
 *
 * The services table is small and unsliced, so it filters client-side over
 * the whole array; the aggregate banner writes its status in words ("All
 * systems operational") on top of any colour it carries.
 *
 * The fixture stores errorRate as a fraction (0.07 reads as 7%), which this
 * page converts and labels rather than presenting a bare number.
 */

import { useMemo, useState } from 'react';
import {
  FiAlertOctagon, FiAlertTriangle, FiCheckCircle, FiClock, FiLayers, FiRefreshCw,
  FiServer, FiSlack, FiZap,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import MetricCard from '@/features/dashboard/components/MetricCard';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import { useGetPlatformSystemQuery } from '../api/superAdminApi';
import { useNotify } from '@/hooks/useNotification';
import { formatCompactNumber, formatPercent } from '@/utils/currency';
import { formatDateTime, fromNow } from '@/utils/date';
import './SystemHealthPage.css';

const STATUS_META = {
  operational: { label: 'All systems operational', tone: 'success' },
  degraded: { label: 'Partial degradation', tone: 'warning' },
  maintenance: { label: 'Scheduled maintenance', tone: 'danger' },
};

const SERVICE_STATUS = {
  operational: { label: 'Operational', tone: 'success' },
  degraded: { label: 'Degraded', tone: 'warning' },
  maintenance: { label: 'Maintenance', tone: 'info' },
};

const INCIDENT_STATUS = {
  monitoring: { label: 'Monitoring', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  investigating: { label: 'Investigating', tone: 'danger' },
};

export default function SystemHealthPage() {
  const notify = useNotify();
  const [serviceSearch, setServiceSearch] = useState('');

  const { data, isLoading, isFetching, isError, error, refetch } = useGetPlatformSystemQuery();

  const statusMeta = STATUS_META[data?.status] ?? { label: 'Unknown', tone: 'neutral' };

  const services = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    const all = data?.services ?? [];
    return term
      ? all.filter(
          (service) =>
            service.name.toLowerCase().includes(term) || service.region.toLowerCase().includes(term),
        )
      : all;
  }, [data, serviceSearch]);

  const serviceColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Service',
        render: (service) => (
          <div className="nx-sys__ident">
            <span className="nx-sys__name">{service.name}</span>
            <span className="nx-sys__meta">{service.region}</span>
          </div>
        ),
      },
      {
        key: 'statusKey',
        header: 'Status',
        render: (service) => {
          const meta = SERVICE_STATUS[service.statusKey] ?? { label: service.statusKey, tone: 'neutral' };
          return (
            <Badge tone={meta.tone} dot>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        key: 'uptime',
        header: 'Uptime',
        align: 'right',
        render: (service) => (
          <span className="nx-sys__num">{formatPercent(service.uptime, 2)}</span>
        ),
      },
      {
        key: 'latencyMs',
        header: 'Latency',
        align: 'right',
        render: (service) => (
          <span className="nx-sys__num" data-high={service.latencyMs > 250 ? 'true' : undefined}>
            {service.latencyMs} ms
          </span>
        ),
      },
    ],
    [],
  );

  const kpis = useMemo(() => {
    const metrics = data?.metrics ?? {};
    return [
      {
        key: 'requests',
        label: 'Requests / min',
        value: formatCompactNumber(metrics.requestsPerMinute ?? 0),
        icon: <FiSlack size={14} />,
        tone: 'accent',
        hint: 'Across all gateways',
      },
      {
        key: 'error-rate',
        label: 'Error rate',
        value: formatPercent((metrics.errorRate ?? 0) * 100, 2),
        icon: <FiAlertTriangle size={14} />,
        tone: 'danger',
        hint: 'Stored as a fraction (0.07 → 7%)',
      },
      {
        key: 'queue',
        label: 'Queue depth',
        value: metrics.queueDepth ?? 0,
        icon: <FiLayers size={14} />,
        tone: 'warning',
        hint: 'Background jobs waiting',
      },
      {
        key: 'latency',
        label: 'p95 latency',
        value: (metrics.p95LatencyMs ?? 0).toLocaleString(),
        icon: <FiZap size={14} />,
        tone: 'info',
        hint: 'Milliseconds, 95th percentile',
      },
    ];
  }, [data]);

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing system health');
  };

  if (isError && !data) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Governance</span>
            <h1 className="page__title">System health</h1>
            <p className="page__subtitle">The health check is unavailable right now.</p>
          </div>
        </div>
        <Card padding="lg">
          <div className="nx-sys__error">
            <h2 className="nx-sys__error-title">Could not check system health</h2>
            <p className="nx-sys__error-text">
              {error?.data?.message ?? 'The platform system endpoint did not respond. Try again in a moment.'}
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
          <span className="page__eyebrow">Governance</span>
          <h1 className="page__title">System health</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Checking services…'
              : `${statusMeta.label} as of ${formatDateTime(data?.checkedAt)}`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh system health"
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

        <div className="nx-sys__banner" data-tone={statusMeta.tone} role="status">
          {statusMeta.tone === 'success' ? (
            <FiCheckCircle size={16} aria-hidden="true" />
          ) : statusMeta.tone === 'warning' ? (
            <FiAlertTriangle size={16} aria-hidden="true" />
          ) : (
            <FiAlertOctagon size={16} aria-hidden="true" />
          )}
          <strong>{isLoading ? 'Checking…' : statusMeta.label}</strong>
          {data ? <span>· checked {fromNow(data.checkedAt)}</span> : null}
        </div>

        <div className="grid grid--split">
          <Card padding="none">
            <div className="nx-sys__card-head">
              <div>
                <h2 className="nx-sys__card-title">Services</h2>
                <p className="nx-sys__card-subtitle">
                  {isLoading
                    ? 'Reading the service list…'
                    : `${data?.services?.length ?? 0} components reporting`}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="nx-sys__skeleton">
                <LoadingState mode="skeleton" variant="list" rows={6} />
              </div>
            ) : (
              <>
                <TableToolbar
                  search={serviceSearch}
                  onSearch={setServiceSearch}
                  searchPlaceholder="Search services"
                  columns={serviceColumns}
                />
                <DataTable
                  columns={serviceColumns}
                  data={services}
                  loading={false}
                  skeleton={false}
                  clientSide
                  hidePagination
                  itemLabel="services"
                  isFiltered={serviceSearch.trim().length > 0}
                  emptyIcon={<FiServer />}
                  emptyTitle="No service matches"
                  emptyDescription="Every component reports under its own name — try a different search."
                />
              </>
            )}
          </Card>

          <Card padding="lg">
            <div className="nx-sys__card-head">
              <div>
                <h2 className="nx-sys__card-title">Incidents</h2>
                <p className="nx-sys__card-subtitle">
                  {data?.incidents?.length
                    ? `${data.incidents.length} on record`
                    : 'No incidents on record'}
                </p>
              </div>
              <Badge tone={statusMeta.tone} dot>
                {statusMeta.label}
              </Badge>
            </div>

            {isLoading ? (
              <LoadingState mode="skeleton" variant="list" rows={3} />
            ) : data?.incidents?.length ? (
              <ul className="nx-sys__incidents">
                {data.incidents.map((incident) => {
                  const meta = INCIDENT_STATUS[incident.statusKey] ?? { label: incident.statusKey, tone: 'neutral' };
                  return (
                    <li className="nx-sys__incident" key={incident.id}>
                      <div className="nx-sys__incident-head">
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
                        <span className="nx-sys__meta mono">{incident.id}</span>
                      </div>
                      <h3 className="nx-sys__incident-title">{incident.title}</h3>
                      <p className="nx-sys__incident-impact">{incident.impact}</p>
                      <p className="nx-sys__incident-when">
                        <FiClock size={11} aria-hidden="true" />
                        Opened {fromNow(incident.openedAt)}
                        {incident.resolvedAt ? ` · resolved ${fromNow(incident.resolvedAt)}` : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<FiCheckCircle />}
                title="No incidents"
                description="Nothing is on fire. When something breaks, it lands here."
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}