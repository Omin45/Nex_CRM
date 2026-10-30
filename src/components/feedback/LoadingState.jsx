/**
 * NexERP — LoadingState
 * ---------------------------------------------------------------------------
 * Every async surface in the app renders one of these four modes:
 *
 *   'spinner'   centred spinner + label, for full-panel loads
 *   'skeleton'  shimmering placeholders shaped like the real content
 *   'inline'    small spinner, for a control that is busy but still visible
 *   'progress'  determinate or indeterminate bar
 *
 * @example
 * <LoadingState mode="skeleton" rows={6} variant="table" />
 */

import './Feedback.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Placeholder shapes per content type. */
const SKELETON_VARIANTS = {
  card: () => (
    <div className="skeleton" style={{ height: 132, borderRadius: 'var(--nx-radius)' }} />
  ),
  list: () => <div className="skeleton skeleton--text" style={{ width: '100%' }} />,
  text: () => <div className="skeleton skeleton--text" style={{ width: '68%' }} />,
  table: () => (
    <div className="nx-skeleton-table">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="nx-skeleton-table__row" key={i}>
          <div className="skeleton skeleton--text" style={{ width: '22%' }} />
          <div className="skeleton skeleton--text" style={{ width: '32%' }} />
          <div className="skeleton skeleton--text" style={{ width: '16%' }} />
          <div className="skeleton skeleton--text" style={{ width: '14%' }} />
        </div>
      ))}
    </div>
  ),
  chart: () => (
    <div
      className="skeleton"
      style={{ height: 260, borderRadius: 'var(--nx-radius)' }}
    />
  ),
  detail: () => (
    <div className="nx-skeleton-stack">
      <div className="skeleton" style={{ height: 28, width: '35%' }} />
      <div className="skeleton" style={{ height: 14 }} />
      <div className="skeleton" style={{ height: 14, width: '85%' }} />
      <div className="skeleton" style={{ height: 14, width: '60%' }} />
    </div>
  ),
};

export default function LoadingState({
  mode = 'spinner',
  variant = 'card',
  rows = 3,
  size = 'md',
  label = 'Loading…',
  title,
  message,
  /** 0–100 for the determinate progress mode. */
  value = 0,
  showLabel = true,
  className = '',
  children,
}) {
  if (mode === 'progress') {
    const indeterminate = value === null || value === undefined;
    return (
      <div className={cx('nx-progress-wrap', className)}>
        {showLabel && !indeterminate ? (
          <div className="row row--between" style={{ marginBottom: 'var(--nx-space-2)' }}>
            <span className="text-sm text-muted">{label}</span>
            <span className="text-sm text-accent mono">{Math.round(value)}%</span>
          </div>
        ) : null}
        <div
          className={cx('nx-progress', indeterminate && 'nx-progress--indeterminate')}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : Math.round(value)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div className="nx-progress__bar" style={{ width: `${indeterminate ? 35 : value}%` }} />
        </div>
      </div>
    );
  }

  if (mode === 'skeleton') {
    const Skeleton = SKELETON_VARIANTS[variant] ?? SKELETON_VARIANTS.card;
    return (
      <div className={cx('nx-skeleton-stack', className)} aria-busy="true" aria-live="polite">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} />
        ))}
        {children}
      </div>
    );
  }

  if (mode === 'inline') {
    return (
      <span className={cx('nx-loading', 'nx-loading--inline', className)} role="status">
        <span className={cx('nx-spinner', `nx-spinner--${size}`)} aria-hidden="true" />
        {showLabel ? <span className="nx-loading__text">{label}</span> : null}
      </span>
    );
  }

  /* Default: full spinner. */
  return (
    <div
      className={cx('nx-loading', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className={cx('nx-spinner', `nx-spinner--${size}`)} aria-hidden="true" />
      {title ? <span className="nx-loading__title">{title}</span> : null}
      {showLabel && label ? <span className="nx-loading__text">{label}</span> : null}
      {message ? <span className="text-sm text-dim">{message}</span> : null}
      {children}
    </div>
  );
}

/** Skeleton row shapes for a table body — used directly inside <tbody>. */
export function TableSkeletonRows({ columns = 5, rows = 8 }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={rowIndex} className="nx-table__row nx-table__row--skeleton">
      {Array.from({ length: columns }, (_, colIndex) => (
        <td key={colIndex} className="nx-table__cell">
          <div
            className="skeleton skeleton--text"
            /* Varying widths stop the placeholder grid from looking mechanical. */
            style={{ width: `${45 + ((rowIndex * 7 + colIndex * 13) % 45)}%` }}
          />
        </td>
      ))}
    </tr>
  ));
}
