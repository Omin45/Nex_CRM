/**
 * ArkCRM — DashboardPage (Executive Vendor Dashboard)
 * ---------------------------------------------------------------------------
 * The landing screen after sign-in. Ordered by what an operator asks, in order:
 *
 *   1. "How are we doing?"      -> the KPI strip
 *   2. "What needs me?"         -> attention panel
 *   3. "Where is the money?"    -> revenue trend, expense mix, AR aging
 *   4. "What's moving?"         -> pipeline, top customers, activity
 *
 * Everything comes from one aggregate request (GET /dashboard/overview), so
 * the page renders in a single paint; widgets degrade to their own skeletons
 * when the aggregate is still in flight.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity, FiAlertCircle, FiClock, FiCreditCard, FiDollarSign, FiRefreshCw,
  FiTrendingDown, FiTrendingUp, FiUsers,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import LineChartCard from '@/components/data-display/Charts/LineChartCard';
import BarChartCard from '@/components/data-display/Charts/BarChartCard';
import PieChartCard from '@/components/data-display/Charts/PieChartCard';
import { useChartTheme } from '@/components/data-display/Charts/ChartCard';
import ActivityTimeline from '@/components/data-display/Timeline/ActivityTimeline';
import LoadingState from '@/components/feedback/LoadingState';
import MetricCard from '../components/MetricCard';
import DashBackdrop from '../components/DashBackdrop';
import PipelineSnapshot from '../components/PipelineSnapshot';
import AttentionPanel from '../components/AttentionPanel';
import QuickActions from '../components/QuickActions';
import TopCustomers from '../components/TopCustomers';
import { useGetOverviewQuery } from '../api/dashboardApi';
import { useCurrentUser } from '@/hooks/useAuth';
import { useNotify } from '@/hooks/useNotification';
import useVendorPath from '@/hooks/useVendorPath';
import { formatCurrency } from '@/utils/currency';
import { DATE_RANGES } from '@/config/constants';
import { appRoutes } from '@/config/navigation.config';
import '../components/Dashboard.css';
import { serverMessage } from '@/utils/errorMessage';

/** "Good morning" / "afternoon" / "evening", from the visitor's clock. */
function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const theme = useChartTheme();
  const user = useCurrentUser();
  const vendorPath = useVendorPath();

  const [range, setRange] = useState('30d');

  const { data, isLoading, isFetching, isError, error, refetch } = useGetOverviewQuery({ range });

  const overview = data ?? {};
  const metrics = overview.metrics ?? {};
  const pipeline = overview.pipeline ?? {};
  const currency = overview.currency ?? 'NGN';
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  /* The header range picker is the only control that changes the request, so
     the whole page re-fetches rather than each widget issuing its own. */
  const handleRangeChange = (next) => {
    setRange(next);
    notify.info(`Showing ${DATE_RANGES.find((r) => r.id === next)?.label.toLowerCase()}`);
  };

  const goToActivity = () => navigate(appRoutes.activity);

  /* Five KPIs, matching the aggregate's metric keys exactly. `inverseDelta`
     flips the arrow for costs, where a fall is the good outcome. */
  const kpis = useMemo(
    () => [
      {
        key: 'sales',
        label: 'Revenue',
        metric: metrics.sales,
        icon: <FiDollarSign size={14} />,
        tone: 'accent',
        to: vendorPath(appRoutes.vendor.accounting.invoices),
      },
      {
        key: 'grossProfit',
        label: 'Gross profit',
        metric: metrics.grossProfit,
        hintOverride: metrics.grossProfit
          ? `${metrics.grossProfit.margin.toFixed(1)}% margin`
          : null,
        icon: <FiTrendingUp size={14} />,
        tone: 'success',
        to: vendorPath(appRoutes.vendor.reports.profitAndLoss),
      },
      {
        key: 'receivables',
        label: 'Receivables',
        metric: metrics.receivables,
        icon: <FiClock size={14} />,
        tone: 'warning',
        to: vendorPath(appRoutes.vendor.accounting.receivables),
      },
      {
        key: 'expenses',
        label: 'Expenses',
        metric: metrics.expenses,
        inverseDelta: true,
        icon: <FiTrendingDown size={14} />,
        tone: 'danger',
        to: vendorPath(appRoutes.vendor.accounting.expenses),
      },
      {
        key: 'payables',
        label: 'Payables',
        metric: metrics.payables,
        inverseDelta: true,
        icon: <FiCreditCard size={14} />,
        tone: 'violet',
        to: vendorPath(appRoutes.vendor.accounting.payables),
      },
    ],
    [metrics, vendorPath],
  );

  if (isError) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">
              <FiAlertCircle size={12} /> Offline
            </span>
            <h1 className="page__title">Dashboard unavailable</h1>
            <p className="page__subtitle">{serverMessage(error, 'The overview could not be loaded.')}</p>
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

  return (
    /* nx-dash marks the screen so Dashboard.css can give it the animated
       shadows and tile treatments without restyling every other .page. */
    <div className="page nx-dash">
      {/* Decorative depth layer; first child so it paints under everything
          (z-index -1 inside this root's stacking context, see Dashboard.css). */}
      <DashBackdrop />

      {/* ---- header ---- */}
      <div className="page__header">
        <div>
          <span className="page__eyebrow">
            <FiActivity size={12} /> Executive overview
          </span>
          <h1 className="page__title">Good {greeting()}, {firstName}</h1>
          <p className="page__subtitle">
            {DATE_RANGES.find((r) => r.id === range)?.label} across sales, finance and inventory.
          </p>
        </div>

        <div className="page__actions">
          <div className="nx-segmented" role="group" aria-label="Reporting period">
            {DATE_RANGES.filter((r) => r.days !== null).slice(0, 4).map((option) => (
              <button
                key={option.id}
                type="button"
                className={`nx-segmented__item${range === option.id ? ' is-active' : ''}`}
                aria-pressed={range === option.id}
                onClick={() => handleRangeChange(option.id)}
              >
                {option.label.replace('Last ', '')}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={refetch}
            aria-label="Refresh dashboard"
            title="Refresh"
          >
            <FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />
          </Button>
        </div>
      </div>

      <div className="page__body">
        {/* ---- KPI strip ---- */}
        {isLoading ? (
          <div className="grid grid--metrics">
            {Array.from({ length: 5 }, (_, i) => (
              <Card key={i} padding="md">
                <LoadingState mode="skeleton" variant="detail" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid--metrics">
            {kpis.map(({ key, label, metric, hintOverride, inverseDelta, icon, tone, to }) => (
              <MetricCard
                key={key}
                label={label}
                value={formatCurrency(metric?.value, { currency, compact: true })}
                delta={metric?.change ?? null}
                inverseDelta={inverseDelta ?? false}
                hint={hintOverride ?? (metric ? `vs previous period` : null)}
                icon={icon}
                tone={tone}
                to={to}
                trend={metric?.spark ?? null}
                trendKey="value"
              />
            ))}
          </div>
        )}

        {/* ---- revenue + attention ---- */}
        <div className="grid grid--split">
          <LineChartCard
            title="Revenue vs expenses"
            subtitle="Monthly, last 12 months"
            data={overview.revenueTrend ?? []}
            xKey="month"
            series={[
              { key: 'revenue', label: 'Revenue', color: theme.accent, area: true },
              { key: 'expenses', label: 'Expenses', color: theme.danger },
              { key: 'profit', label: 'Profit', color: theme.success },
            ]}
            currency={currency}
            height={300}
            showLegend
            loading={isLoading}
            error={isError ? (serverMessage(error, 'The trend could not be loaded')) : null}
          />

          {isLoading ? (
            <Card padding="md">
              <LoadingState mode="skeleton" variant="table" />
            </Card>
          ) : (
            <AttentionPanel items={overview.attention ?? []} currency={currency} />
          )}
        </div>

        {/* ---- pipeline + expense mix ---- */}
        <div className="grid grid--split">
          {isLoading ? (
            <Card padding="md">
              <LoadingState mode="skeleton" variant="detail" />
            </Card>
          ) : (
            <PipelineSnapshot
              stages={pipeline.stages ?? []}
              summary={pipeline}
              currency={currency}
            />
          )}

          <PieChartCard
            title="Expense mix"
            subtitle="By category, this period"
            data={overview.expenseBreakdown ?? []}
            nameKey="name"
            valueKey="value"
            currency={currency}
            centerLabel="Total spend"
            height={300}
            showLegend={false}
            loading={isLoading}
          />
        </div>

        {/* ---- AR aging + top customers ---- */}
        <div className="grid grid--split">
          <BarChartCard
            title="Receivables aging"
            subtitle="Outstanding balance by age bucket"
            data={overview.receivablesAging ?? []}
            xKey="bucket"
            series={[{ key: 'amount', label: 'Outstanding', color: theme.warning }]}
            currency={currency}
            height={260}
            showValues
            loading={isLoading}
          />

          {isLoading ? (
            <Card padding="md">
              <LoadingState mode="skeleton" variant="table" />
            </Card>
          ) : (
            <TopCustomers customers={overview.topCustomers ?? []} currency={currency} />
          )}
        </div>

        {/* ---- quick actions + activity ---- */}
        <div className="grid grid--split">
          <QuickActions />

          <Card padding="none">
            <Card.Header
              title="Recent activity"
              subtitle="Across your workspace"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<FiUsers size={13} />}
                  onClick={goToActivity}
                >
                  Full log
                </Button>
              }
            />
            <Card.Body>
              <ActivityTimeline
                entries={overview.activity ?? []}
                loading={isLoading}
                limit={6}
                onShowAll={goToActivity}
              />
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}
