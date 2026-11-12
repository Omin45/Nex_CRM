/**
 * ArkCRM — BarChartCard
 * ---------------------------------------------------------------------------
 * Categorical comparison wrapper: expense mix by category, invoices by status,
 * headcount by department, AR by aging bucket.
 *
 * Supports grouped and stacked layouts, plus rounded top corners on each bar.
 *
 * @example
 * <BarChartCard
 *   title="Expense mix"
 *   data={expenseBreakdown}
 *   xKey="name"
 *   series={[{ key: 'value', label: 'Spend', color: '#818cf8' }]}
 *   layout="vertical"
 * />
 */

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts';
import ChartCard, { ChartTooltip, ChartLegend, useChartTheme } from './ChartCard';

export default function BarChartCard({
  title,
  subtitle,
  data = [],
  xKey = 'name',
  yKey = 'value',
  series = [{ key: yKey, label: 'Value' }],
  /** 'horizontal' stacks series side by side; 'vertical' is the default. */
  layout = 'horizontal',
  stacked = false,
  /** Per-bar colours taken from a `color` field on the datum. */
  colorByPoint = false,
  showValues = false,
  currency = 'NGN',
  height = 280,
  showGrid = true,
  showLegend = false,
  legend,
  loading = false,
  error = null,
  action = null,
  className = '',
  barSize,
}) {
  const theme = useChartTheme();

  const isVertical = layout === 'vertical';

  /* Resolve the bar colour: explicit series colour, a per-datum field, or the
     theme accent. */
  const resolveColor = (item, datum, index) => {
    if (colorByPoint) return datum?.color ?? theme.accent;
    return item.color ?? theme.accent;
  };

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
        showLegend ? (
          <ChartLegend
            items={colorByPoint
              ? data.map((d, i) => ({ label: d[xKey], color: d.color ?? theme.accent }))
              : series.map((s) => ({ label: s.label, color: s.color ?? theme.accent }))}
          />
        ) : (
          legend
        )
      }
    >
      {({ money }) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={isVertical ? 'vertical' : 'horizontal'}
            margin={
              isVertical
                ? { top: 4, right: 16, left: 8, bottom: 4 }
                : { top: 8, right: 8, left: 0, bottom: 0 }
            }
            barCategoryGap={isVertical ? '22%' : '28%'}
          >
            {showGrid ? (
              <CartesianGrid
                stroke={theme.grid}
                strokeDasharray="3 3"
                vertical={isVertical}
                horizontal={!isVertical}
              />
            ) : null}

            {/* Category axis flips for horizontal bars. */}
            {isVertical ? (
              <>
                <XAxis type="number" stroke={theme.axis} tick={{ fill: theme.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => money(v).replace(/[^\d.,KMB]/g, '')} />
                <YAxis type="category" dataKey={xKey} stroke={theme.axis} tick={{ fill: theme.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={92} />
              </>
            ) : (
              <>
                <XAxis dataKey={xKey} stroke={theme.axis} tick={{ fill: theme.tick, fontSize: 11 }} tickLine={false} axisLine={false} dy={6} />
                <YAxis stroke={theme.axis} tick={{ fill: theme.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => money(v).replace(/[^\d.,KMB]/g, '')} />
              </>
            )}

            <Tooltip
              content={<ChartTooltip formatter={money} />}
              cursor={{ fill: theme.accentSoft, radius: 6 }}
            />

            {series.map((item, seriesIndex) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stackId={stacked ? 'stack' : undefined}
                fill={item.color ?? theme.accent}
                /* Rounded only on the outer edge of a stack. */
                radius={
                  stacked
                    ? seriesIndex === 0
                      ? isVertical
                        ? [4, 4, 0, 0]
                        : [0, 4, 4, 0]
                      : seriesIndex === series.length - 1
                        ? isVertical
                          ? [0, 0, 4, 4]
                          : [4, 0, 0, 4]
                        : 0
                    : isVertical
                      ? [0, 4, 4, 0]
                      : [4, 4, 0, 0]
                }
                barSize={barSize}
                maxBarSize={isVertical ? 22 : 46}
              >
                {/* Per-point colouring when the datum carries its own colour. */}
                {colorByPoint
                  ? data.map((datum, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={datum.color ?? theme.accent}
                        fillOpacity={0.85}
                      />
                    ))
                  : null}

                {showValues ? (
                  <LabelList
                    dataKey={item.key}
                    position={isVertical ? 'right' : 'top'}
                    formatter={money}
                    style={{ fill: theme.tick, fontSize: 10 }}
                  />
                ) : null}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
