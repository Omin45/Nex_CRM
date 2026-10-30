/**
 * NexERP — LineChartCard
 * ---------------------------------------------------------------------------
 * Time-series wrapper (revenue trend, cash flow, attendance over days).
 * Supports an optional gradient area fill, which is what gives the dashboard
 * revenue chart its depth.
 *
 * @example
 * <LineChartCard
 *   title="Revenue vs expenses"
 *   subtitle="Last 12 months"
 *   data={revenueTrend}
 *   xKey="month"
 *   series={[
 *     { key: 'revenue', label: 'Revenue', color: '#38bdf8', area: true },
 *     { key: 'expenses', label: 'Expenses', color: '#fb7185' },
 *   ]}
 *   currency="NGN"
 * />
 */

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import ChartCard, { ChartTooltip, ChartLegend, useChartTheme } from './ChartCard';

export default function LineChartCard({
  title,
  subtitle,
  data = [],
  xKey = 'month',
  series = [],
  currency = 'NGN',
  height = 280,
  /** Compact Y-axis tick values (e.g. 1.2M). */
  compactAxis = true,
  showGrid = true,
  showLegend = false,
  legend,
  referenceLine,
  loading = false,
  error = null,
  action = null,
  className = '',
  curveType = 'monotone',
}) {
  const theme = useChartTheme();

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={action}
      height={height}
      loading={loading}
      error={error}
      isEmpty={!loading && !error && (!data || data.length === 0)}
      className={className}
      legend={
        showLegend && series.length ? (
          <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />
        ) : (
          legend
        )
      }
    >
      {({ money }) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {/* Vertical fade for the area fill under the primary series. */}
              <linearGradient id="nx-area-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
              </linearGradient>
            </defs>

            {showGrid ? (
              <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            ) : null}

            <XAxis
              dataKey={xKey}
              stroke={theme.axis}
              tick={{ fill: theme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              dy={6}
            />

            <YAxis
              stroke={theme.axis}
              tick={{ fill: theme.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={compactAxis ? 52 : 68}
              tickFormatter={(value) => money(value).replace(/[^\d.,KMB]/g, '')}
            />

            <Tooltip
              content={<ChartTooltip formatter={money} />}
              cursor={{ stroke: theme.accent, strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {showLegend && series.length > 1 ? (
              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, color: theme.tick }}
              />
            ) : null}

            {/* Zero line — useful for charts that can dip negative. */}
            {referenceLine !== undefined ? (
              <ReferenceLine y={referenceLine} stroke={theme.grid} strokeDasharray="2 4" />
            ) : null}

            {series.map((item) => (
              <Line
                key={item.key}
                type={curveType}
                dataKey={item.key}
                name={item.label}
                stroke={item.color ?? theme.accent}
                strokeWidth={item.strokeWidth ?? 2}
                /* A small dot on hover only keeps the line uncluttered. */
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: theme.accent }}
                strokeDasharray={item.dashed ? '5 5' : undefined}
                connectNulls
                {...(item.area
                  ? { fill: 'url(#nx-area-fade)', fillOpacity: 1 }
                  : {})}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
