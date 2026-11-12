/**
 * ArkCRM — ChartCard
 * ---------------------------------------------------------------------------
 * The shared shell every chart wrapper renders into: a titled card, a legend
 * row, and a body sized for Recharts' ResponsiveContainer.
 *
 * It also owns the Recharts defaults (grid, axis, tooltip) so all charts in
 * the app read as one system, and re-renders on theme change because Recharts
 * bakes colours into SVG attributes at mount.
 */

import { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/currency';
import Card from '@/components/ui/Card/Card';
import LoadingState from '@/components/feedback/LoadingState';
import EmptyState from '@/components/feedback/EmptyState';
import './Charts.css';

/**
 * Resolves a colour for an axis/grid based on the active theme.
 * @returns {string} a CSS var() reference or a literal hex
 */
export function useChartTheme() {
  const { isDark } = useTheme();

  return useMemo(
    () => ({
      isDark,
      grid: isDark ? 'rgba(148, 163, 184, 0.09)' : 'rgba(15, 23, 42, 0.08)',
      axis: isDark ? '#64748b' : '#64748b',
      tick: isDark ? '#64748b' : '#475569',
      /** Recharts wants literal fills on gradients and bars, not var(). */
      accent: isDark ? '#38bdf8' : '#0284c7',
      accentSoft: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.2)',
      indigo: isDark ? '#818cf8' : '#4f46e5',
      cyan: isDark ? '#22d3ee' : '#0891b2',
      success: isDark ? '#34d399' : '#059669',
      warning: isDark ? '#fbbf24' : '#d97706',
      danger: isDark ? '#fb7185' : '#e11d48',
      violet: isDark ? '#a78bfa' : '#7c3aed',
    }),
    [isDark],
  );
}

/** A consistent dark-glass tooltip body for every chart. */
export function ChartTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="nx-chart__tooltip">
      {label !== undefined ? (
        <p className="nx-chart__tooltip-label">{labelFormatter ? labelFormatter(label) : label}</p>
      ) : null}
      <ul className="nx-chart__tooltip-list">
        {payload.map((entry) => (
          <li key={entry.dataKey ?? entry.name} className="nx-chart__tooltip-item">
            <span className="nx-chart__tooltip-swatch" style={{ background: entry.color ?? entry.fill }} />
            <span className="nx-chart__tooltip-name">{entry.name}</span>
            <span className="nx-chart__tooltip-value">
              {formatter ? formatter(entry.value, entry) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Legend rendered as HTML rather than SVG, so the pills can be styled. */
export function ChartLegend({ items, className = '' }) {
  if (!items?.length) return null;

  return (
    <ul className={`nx-chart__legend ${className}`}>
      {items.map((item) => (
        <li key={item.label} className="nx-chart__legend-item">
          <span className="nx-chart__legend-swatch" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {number} [height=280] the chart body height in px
 */
export default function ChartCard({
  title,
  subtitle,
  action = null,
  legend = null,
  height = 280,
  loading = false,
  error = null,
  isEmpty = false,
  emptyLabel = 'No data for this period',
  currency = 'NGN',
  /** Applied to the Recharts <ResponsiveContainer> parent. */
  className = '',
  bodyClassName = '',
  children,
}) {
  /* Both are resolved here, not inside the children callback — a hook must
     never run inside a render prop. */
  const money = (value) => formatCurrency(value, { currency, compact: false });
  const theme = useChartTheme();

  if (loading) {
    return (
      <Card className={className} padding="none">
        <ChartCardHeader title={title} subtitle={subtitle} action={action} />
        <div className="nx-chart__body" style={{ height }}>
          <LoadingState mode="skeleton" variant="chart" rows={1} />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className} padding="none">
        <ChartCardHeader title={title} subtitle={subtitle} action={action} />
        <div className="nx-chart__body" style={{ height }}>
          <EmptyState icon="!" title="Chart unavailable" description={error} />
        </div>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className={className} padding="none">
        <ChartCardHeader title={title} subtitle={subtitle} action={action} />
        <div className="nx-chart__body" style={{ height }}>
          <EmptyState title={emptyLabel} description="Try widening the date range." />
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      <ChartCardHeader title={title} subtitle={subtitle} action={action} />

      <div className="nx-chart__body" style={{ height }}>
        {children({ money, theme })}
      </div>

      {legend ? <div className="nx-chart__footer">{legend}</div> : null}
    </Card>
  );
}

/** Title row, separated from the chart by a hairline. */
export function ChartCardHeader({ title, subtitle, action }) {
  if (!title && !action) return null;

  return (
    <header className="nx-chart__header">
      <div className="min-w-0">
        {title ? <h3 className="nx-chart__title">{title}</h3> : null}
        {subtitle ? <p className="nx-chart__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="nx-chart__header-action">{action}</div> : null}
    </header>
  );
}
