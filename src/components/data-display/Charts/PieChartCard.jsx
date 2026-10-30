/**
 * NexERP — PieChartCard
 * ---------------------------------------------------------------------------
 * Donut / pie wrapper for expense mix, invoice status distribution and
 * pipeline composition.
 *
 * Renders as a donut by default (innerRadius), with a centred total. The centre
 * label is a real DOM node overlaid on the SVG rather than a Recharts <Label>,
 * which keeps the typography consistent with the rest of the app.
 *
 * @example
 * <PieChartCard
 *   title="Expense mix"
 *   data={expenseBreakdown}
 *   nameKey="name"
 *   valueKey="value"
 *   centerLabel="Total spend"
 * />
 */

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import ChartCard, { ChartTooltip, ChartLegend, useChartTheme } from './ChartCard';

export default function PieChartCard({
  title,
  subtitle,
  data = [],
  nameKey = 'name',
  valueKey = 'value',
  /** Values under this are grouped into an "Other" slice. */
  collapseBelow = null,
  donut = true,
  innerRadius = 62,
  outerRadius = 92,
  centerLabel,
  centerValue,
  currency = 'NGN',
  height = 280,
  showLegend = true,
  legend,
  loading = false,
  error = null,
  action = null,
  className = '',
}) {
  const theme = useChartTheme();

  /* Fallback palette, cycled when a datum carries no colour. */
  const palette = [
    theme.accent, theme.indigo, theme.cyan, theme.violet,
    theme.success, theme.warning, theme.danger, theme.tick,
  ];

  const resolveData = () => {
    if (!data?.length) return [];

    if (!collapseBelow) return data;

    /* Merge every small slice into one "Other" bucket so the ring does not
       turn into confetti. */
    const kept = data.filter((d) => Number(d[valueKey]) >= collapseBelow);
    const merged = data
      .filter((d) => Number(d[valueKey]) < collapseBelow)
      .reduce((sum, d) => sum + Number(d[valueKey]), 0);

    return merged > 0
      ? [...kept, { [nameKey]: 'Other', [valueKey]: merged, color: theme.tick }]
      : kept;
  };

  const slices = resolveData();
  const total = slices.reduce((sum, slice) => sum + Number(slice[valueKey] ?? 0), 0);

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
            items={slices.map((slice, index) => ({
              label: slice[nameKey],
              color: slice.color ?? palette[index % palette.length],
            }))}
          />
        ) : (
          legend
        )
      }
    >
      {({ money }) => (
        <div className="nx-chart__pie">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey={valueKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                /* The donut hole gives the card a focal point and room for the
                   centre total. */
                innerRadius={donut ? innerRadius : 0}
                outerRadius={outerRadius}
                paddingAngle={2}
                stroke="none"
                startAngle={90}
                endAngle={-270}
                isAnimationActive
                animationDuration={700}
              >
                {slices.map((slice, index) => (
                  <Cell
                    key={slice[nameKey] ?? index}
                    fill={slice.color ?? palette[index % palette.length]}
                    /* Hovering a slice lifts it slightly out of the ring. */
                    className="nx-chart__slice"
                  />
                ))}
              </Pie>

              <Tooltip content={<ChartTooltip formatter={money} />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Centre overlay, positioned over the donut hole. */}
          {donut && (centerLabel || centerValue !== undefined) ? (
            <div className="nx-chart__pie-center" aria-hidden="true">
              <span className="nx-chart__pie-value">
                {centerValue !== undefined ? centerValue : money(total)}
              </span>
              {centerLabel ? (
                <span className="nx-chart__pie-label">{centerLabel}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </ChartCard>
  );
}
