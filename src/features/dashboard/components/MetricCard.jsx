/**
 * ArkCRM — MetricCard
 * ---------------------------------------------------------------------------
 * The KPI tile on the executive dashboard: a value, a delta against the
 * previous period, and a sparkline. The delta is the whole point — a number
 * with no comparison is decoration — so the comparison window is always
 * rendered, and "flat" is styled neutrally rather than as a win.
 *
 * @example
 * <MetricCard
 *   label="Revenue (MTD)"
 *   value={formatCurrency(metrics.revenue, { compact: true })}
 *   delta={metrics.revenueDelta}
 *   trend={sparkline}
 *   icon={<FiTrendingUp />}
 *   tone="accent"
 *   to="/accounting/invoices"
 * />
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowDownRight, FiArrowUpRight, FiMinus } from 'react-icons/fi';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import Card from '@/components/ui/Card/Card';
import { useChartTheme } from '@/components/data-display/Charts/ChartCard';
import './Dashboard.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Maps a tone to the three delta states. */
const TONE = {
  accent: { from: 'rgba(56, 189, 248, 0.28)', to: 'rgba(56, 189, 248, 0)' },
  success: { from: 'rgba(52, 211, 153, 0.28)', to: 'rgba(52, 211, 153, 0)' },
  warning: { from: 'rgba(251, 191, 36, 0.28)', to: 'rgba(251, 191, 36, 0)' },
  danger: { from: 'rgba(251, 113, 133, 0.28)', to: 'rgba(251, 113, 133, 0)' },
  violet: { from: 'rgba(167, 139, 250, 0.28)', to: 'rgba(167, 139, 250, 0)' },
};

const STROKE = {
  accent: '#38bdf8',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#fb7185',
  violet: '#a78bfa',
};

export default function MetricCard({
  label,
  value,
  /** Percentage change vs the previous period. */
  delta = null,
  /** 0–100; when set, a negative delta stops reading as a failure. */
  inverseDelta = false,
  hint = null,
  icon = null,
  tone = 'accent',
  trend = null,
  trendKey = 'value',
  to = null,
  loading = false,
  onClick = null,
}) {
  const theme = useChartTheme();
  const palette = TONE[tone] ?? TONE.accent;
  const stroke = STROKE[tone] ?? STROKE.accent;

  /* An inverted metric (expenses, overdue invoices, churn) is "good" when it
     falls, so the arrow and the colour swap. */
  const state = useMemo(() => {
    if (delta === null || delta === undefined) return null;
    const numeric = Number(delta);
    if (!Number.isFinite(numeric) || numeric === 0) return 'flat';
    const up = numeric > 0;
    return (up !== inverseDelta) ? 'up' : 'down';
  }, [delta, inverseDelta]);

  const DeltaIcon = state === 'flat' ? FiMinus : state === 'up' ? FiArrowUpRight : FiArrowDownRight;

  /* The API ships the sparkline as a bare number array; normalise it to rows so
     Recharts always has a single, predictable shape to read. */
  const spark = useMemo(() => {
    if (!trend?.length) return null;
    return trend.map((point) => (typeof point === 'number' ? { value: point } : point));
  }, [trend]);

  const body = (
    <>
      <div className="nx-metric__head">
        <span className="nx-metric__label" title={label}>{label}</span>
        {icon ? <span className="nx-metric__icon" aria-hidden="true">{icon}</span> : null}
      </div>

      <div className="nx-metric__value" title={String(value)}>{value}</div>

      <div className="nx-metric__foot">
        {state ? (
          <span className={cx('nx-metric__delta', `is-${state}`)}>
            <DeltaIcon size={13} aria-hidden="true" />
            {Math.abs(Number(delta)).toFixed(1)}%
          </span>
        ) : null}

        {hint ? <span className="nx-metric__hint" title={hint}>{hint}</span> : null}
      </div>

      {/* The sparkline sits behind the copy, so it never shifts the baseline. */}
      {spark?.length ? (
        <div className="nx-metric__spark" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${tone}-${trendKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.from} />
                  <stop offset="100%" stopColor={palette.to} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={trendKey}
                stroke={stroke}
                strokeWidth={1.6}
                fill={`url(#spark-${tone}-${trendKey})`}
                dot={false}
                isAnimationActive={!theme.isDark}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </>
  );

  const className = 'nx-metric';

  if (to) {
    return (
      <Link to={to} className={cx(className, 'is-linked')} aria-label={`${label}: ${value}`}>
        {body}
        {/* A tinted rail matching the card's tone, per the spec's edge accent. */}
        <span className={cx('nx-metric__edge', `is-${tone}`)} aria-hidden="true" />
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={cx(className, 'is-linked')} onClick={onClick}>
        {body}
        <span className={cx('nx-metric__edge', `is-${tone}`)} aria-hidden="true" />
      </button>
    );
  }

  return (
    <Card className={className} padding="md">
      {body}
      <span className={cx('nx-metric__edge', `is-${tone}`)} aria-hidden="true" />
    </Card>
  );
}
