/**
 * NexERP — PlatformReportsPage
 * ---------------------------------------------------------------------------
 * The questions a platform operator actually asks: how much revenue the
 * whole platform books, how it splits by plan, which tenants are drifting
 * towards churn, and (table, bottom) how each tenant is performing against
 * adoption, support load and NPS.
 *
 * Data sources, all read-only:
 *   - GET /vendors/stats            platform MRR and tenant counts
 *   - GET /reports/profit-loss      revenue, current vs previous, for growth
 *   - GET /reports/vendor-performance  a flat 8-row array (no envelope!)
 *   - GET /vendors?page=1&pageSize=100  plan mix for the MRR-by-plan chart
 *   - POST /reports/export          PDF / CSV (mock returns metadata only)
 *
 * Everything monetary renders through formatCurrency (platform home
 * currency, NGN — the fixture never stores another) and `percentChange`
 * supplies the growth figure, which is shown as text, never just a colour.
 *
 * The vendor-performance endpoint returns a raw array rather than the
 * `{ items }` envelope every other mock collection uses, so this screen
 * treats it as one unsliced list.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity, FiAlertTriangle, FiCheckCircle, FiDownload, FiLifeBuoy, FiRefreshCw, FiTrendingUp,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import MetricCard from '@/features/dashboard/components/MetricCard';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import BarChartCard from '@/components/data-display/Charts/BarChartCard';
import { useGetStatsQuery, useGetVendorsQuery } from '../api/superAdminApi';
import { useGetVendorPerformanceQuery, useGetProfitAndLossQuery, useExportReportMutation } from '@/features/reports/api/reportsApi';
import { useNotify } from '@/hooks/useNotification';
import { formatCurrency, percentChange } from '@/utils/currency';
import { appRoutes } from '@/config/navigation.config';
import './PlatformReportsPage.css';

const PLAN_LABELS = {
  STARTER: 'Starter',
  GROWTH: 'Growth',
  SCALE: 'Scale',
  ENTERPRISE: 'Enterprise',
};

/* Why a tenant lands on the churn watchlist. Kept as words — the card these
   power is a triage queue, and "NPS −4" is better triage than any colour. */
const riskReason = (row) => {
  if (row.nps <= 10 && row.adoption < 50) return `NPS ${row.nps} · ${row.adoption}% adoption`;
  if (row.nps <= 10) return `NPS ${row.nps}`;
  return `${row.adoption}% adoption`;
};

const isAtRisk = (row) => row.nps <= 10 || row.adoption < 50;

export default function PlatformReportsPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const [perfSearch, setPerfSearch] = useState('');
  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState(null);

  const statsQuery = useGetStatsQuery();
  const pnlQuery = useGetProfitAndLossQuery();
  const perfQuery = useGetVendorPerformanceQuery();
  const vendorsQuery = useGetVendorsQuery({ page: 1, pageSize: 100 });
  const [runExport] = useExportReportMutation();

  const isLoading = statsQuery.isLoading || pnlQuery.isLoading || perfQuery.isLoading;
  const isError = (statsQuery.isError && !statsQuery.data) || (perfQuery.isError && !perfQuery.data);

  /* ---- MRR split by plan (money-only series; counts live in the legend) -- */
  const planRevenue = useMemo(() => {
    const buckets = {};
    for (const vendor of vendorsQuery.data?.items ?? []) {
      buckets[vendor.plan] ??= { plan: vendor.plan, mrr: 0, count: 0 };
      buckets[vendor.plan].mrr += vendor.mrr ?? 0;
      buckets[vendor.plan].count += 1;
    }
    return Object.values(buckets);
  }, [vendorsQuery.data]);

  const kpis = useMemo(() => {
    const revenueGrowth = pnlQuery.data
      ? percentChange(pnlQuery.data.revenue?.current ?? 0, pnlQuery.data.revenue?.previous ?? 0)
      : 0;
    const risks = (perfQuery.data ?? []).filter(isAtRisk);
    const supportLoad = (perfQuery.data ?? []).reduce((sum, row) => sum + (row.supportTickets ?? 0), 0);

    return [
      {
        key: 'mrr',
        label: 'Platform MRR',
        value: formatCurrency(statsQuery.data?.mrr ?? 0, { compact: true }),
        icon: <FiActivity size={14} />,
        tone: 'accent',
        hint: 'Across every tenant',
      },
      {
        key: 'revenue',
        label: 'Revenue',
        value: formatCurrency(pnlQuery.data?.revenue?.current ?? 0, { compact: true }),
        icon: <FiTrendingUp size={14} />,
        tone: 'success',
        hint: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% vs previous year`,
      },
      {
        key: 'risk',
        label: 'Churn risk',
        value: risks.length,
        icon: <FiAlertTriangle size={14} />,
        tone: 'danger',
        hint: 'NPS ≤ 10 or adoption < 50%',
      },
      {
        key: 'support',
        label: 'Support load',
        value: supportLoad,
        icon: <FiLifeBuoy size={14} />,
        tone: 'warning',
        hint: 'Open tickets, tracked tenants',
      },
    ];
  }, [statsQuery.data, pnlQuery.data, perfQuery.data]);

  const watchlist = useMemo(() => {
    const risks = (perfQuery.data ?? []).filter(isAtRisk);
    return risks.slice().sort((a, b) => (a.nps ?? 0) - (b.nps ?? 0)).slice(0, 5);
  }, [perfQuery.data]);

  const perfRows = useMemo(() => {
    const term = perfSearch.trim().toLowerCase();
    const rows = perfQuery.data ?? [];
    return term ? rows.filter((row) => row.name.toLowerCase().includes(term)) : rows;
  }, [perfQuery.data, perfSearch]);

  const performanceColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Tenant',
        render: (row) => (
          <div className="nx-plat__ident">
            <span className="nx-plat__name">{row.name}</span>
            <span className="nx-plat__meta mono">{row.id}</span>
          </div>
        ),
      },
      {
        key: 'mrr',
        header: 'MRR',
        align: 'right',
        render: (row) => (
          <span className="nx-plat__mono">{formatCurrency(row.mrr)}</span>
        ),
      },
      {
        key: 'invoices',
        header: 'Invoices',
        align: 'right',
        render: (row) => <span className="nx-plat__num">{row.invoices}</span>,
      },
      {
        key: 'adoption',
        header: 'Adoption',
        sortable: true,
        render: (row) => (
          <div className="nx-plat__gauge">
            <div className="nx-plat__gauge-head">
              <span>{row.adoption}%</span>
            </div>
            <progress
              className="nx-plat__bar"
              max={100}
              value={row.adoption}
              aria-label={`Adoption ${row.adoption}%`}
            />
          </div>
        ),
      },
      {
        key: 'supportTickets',
        header: 'Support tickets',
        align: 'right',
        sortable: true,
        render: (row) => <span className="nx-plat__num">{row.supportTickets}</span>,
      },
      {
        key: 'nps',
        header: 'NPS',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="nx-plat__nps" data-low={row.nps <= 10 ? 'true' : undefined}>
            {row.nps}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge tone={row.status?.tone ?? 'neutral'} dot>
            {row.status?.label ?? 'Unknown'}
          </Badge>
        ),
      },
    ],
    [],
  );

  const handleExport = async (format) => {
    setExporting(format);
    setExportError(null);
    try {
      const payload = await runExport({ format, report: 'vendor-performance' }).unwrap();
      /* A real backend streams a file (responseHandler: 'blob'); the mock
         returns metadata instead — mirror the canonical Reports export flow. */
      if (payload?.report) {
        notify.success(`Vendor performance · ${format.toUpperCase()} — demo export, no file is generated in this mock.`);
      }
    } catch (err) {
      setExportError(err?.data?.message ?? err?.message ?? 'The export request failed.');
      notify.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleRefresh = () => {
    statsQuery.refetch();
    pnlQuery.refetch();
    perfQuery.refetch();
    notify.info('Refreshing platform reports');
  };

  if (isError) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Revenue</span>
            <h1 className="page__title">Platform reports</h1>
            <p className="page__subtitle">The platform is not reporting right now.</p>
          </div>
        </div>
        <Card padding="lg">
          <div className="nx-plat__error">
            <h2 className="nx-plat__error-title">Could not build the report</h2>
            <p className="nx-plat__error-text">
              {statsQuery.error?.data?.message ?? perfQuery.error?.data?.message ?? 'One of the report endpoints did not respond. Try again in a moment.'}
            </p>
            <Button onClick={handleRefresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Revenue</span>
          <h1 className="page__title">Platform reports</h1>
          <p className="page__subtitle">MRR, growth and tenant health across the whole platform.</p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} />}
            onClick={handleRefresh}
            aria-label="Refresh platform reports"
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

        <div className="grid grid--split">
          <BarChartCard
            title="MRR by plan"
            subtitle="What each tier contributes this month"
            data={planRevenue}
            xKey="plan"
            series={[{ key: 'mrr', label: 'Monthly recurring' }]}
            loading={vendorsQuery.isLoading}
            error={vendorsQuery.isError ? 'Could not build the plan mix chart.' : null}
            showLegend={false}
            legend={(
              <div className="nx-plat__legend">
                {planRevenue.map((row) => (
                  <div className="nx-plat__legend-row" key={row.plan}>
                    <span className="nx-plat__legend-plan">{PLAN_LABELS[row.plan] ?? row.plan}</span>
                    <span className="nx-plat__legend-count">
                      {row.count} {row.count === 1 ? 'tenant' : 'tenants'}
                    </span>
                    <span className="nx-plat__legend-mrr">{formatCurrency(row.mrr, { compact: true })}</span>
                  </div>
                ))}
              </div>
            )}
          />

          <Card padding="lg">
            <div className="nx-plat__card-head">
              <div>
                <h2 className="nx-plat__card-title">Churn watchlist</h2>
                <p className="nx-plat__card-subtitle">
                  {watchlist.length
                    ? 'Lowest NPS and adoption, lowest first'
                    : 'Nobody is at risk right now'}
                </p>
              </div>
              <Badge tone={watchlist.length ? 'danger' : 'success'} dot>
                {watchlist.length} at risk
              </Badge>
            </div>

            {perfQuery.isLoading ? (
              <LoadingState mode="skeleton" variant="list" rows={4} />
            ) : watchlist.length ? (
              <ul className="nx-plat__watch">
                {watchlist.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="nx-plat__watch-row"
                      onClick={() => navigate(appRoutes.admin.vendorDetail(row.id))}
                    >
                      <span className="nx-plat__watch-info">
                        <span className="nx-plat__name">{row.name}</span>
                        <Badge tone="danger" size="xs">{riskReason(row)}</Badge>
                      </span>
                      <span className="nx-plat__watch-mrr">{formatCurrency(row.mrr, { compact: true })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<FiCheckCircle />}
                title="All tenants are healthy"
                description="No tenant has an NPS at or below 10 or adoption under 50%."
              />
            )}
          </Card>
        </div>

        <section className="page__section">
          <div className="nx-plat__section-head">
            <div>
              <h2 className="page__section-title">Tenant performance</h2>
              <p className="nx-plat__section-subtitle">
                The full vendor-performance list, searchable by name, NPS and adoption included.
              </p>
            </div>
            <div className="nx-plat__exports">
              {exportError ? (
                <span className="nx-plat__export-error">{exportError}</span>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FiDownload size={14} />}
                onClick={() => handleExport('pdf')}
                loading={exporting === 'pdf'}
                disabled={perfQuery.isLoading}
              >
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FiDownload size={14} />}
                onClick={() => handleExport('csv')}
                loading={exporting === 'csv'}
                disabled={perfQuery.isLoading}
              >
                Export CSV
              </Button>
            </div>
          </div>

          <Card padding="none">
            <TableToolbar
              search={perfSearch}
              onSearch={setPerfSearch}
              searchPlaceholder="Search tenants"
              columns={performanceColumns}
            />
            <DataTable
              columns={performanceColumns}
              data={perfRows}
              loading={perfQuery.isLoading}
              skeleton
              clientSide
              hidePagination
              itemLabel="tenants"
              isFiltered={perfSearch.trim().length > 0}
              onRowClick={(row) => navigate(appRoutes.admin.vendorDetail(row.id))}
              emptyIcon={<FiCheckCircle />}
              emptyTitle="No tenants match"
              emptyDescription="Try a different name — every tracked tenant appears in this list."
            />
          </Card>
        </section>
      </div>
    </div>
  );
}