/**
 * ArkCRM — Badge
 * ---------------------------------------------------------------------------
 * Soft status pill with a glow, used for every status vocabulary in the app
 * (PAID, OVERDUE, ACTIVE, lead stages, task statuses).
 *
 * Status maps in config/constants.js carry a `tone` key; pass that straight
 * through: <Badge tone={invoice.status.tone}>{invoice.status.label}</Badge>
 */

import './Badge.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export const BADGE_TONES = {
  success: 'nx-badge--success',
  warning: 'nx-badge--warning',
  danger: 'nx-badge--danger',
  info: 'nx-badge--info',
  accent: 'nx-badge--accent',
  violet: 'nx-badge--violet',
  neutral: 'nx-badge--neutral',
};

export const BADGE_SIZES = {
  xs: 'nx-badge--xs',
  sm: 'nx-badge--sm',
  md: 'nx-badge--md',
};

export default function Badge({
  children,
  tone = 'neutral',
  size = 'sm',
  /** Leading status dot. */
  dot = false,
  /** Adds a pulsing ring — reserve for live/urgent states. */
  pulse = false,
  /** Solid fill instead of the default tinted glass. */
  solid = false,
  /** Uppercase + wide tracking, for compact table cells. */
  uppercase = true,
  icon = null,
  className = '',
  title,
  ...rest
}) {
  return (
    <span
      className={cx(
        'nx-badge',
        BADGE_TONES[tone] ?? BADGE_TONES.neutral,
        BADGE_SIZES[size] ?? BADGE_SIZES.sm,
        dot && 'nx-badge--dot',
        pulse && 'nx-badge--pulse',
        solid && 'nx-badge--solid',
        uppercase && 'nx-badge--upper',
        className,
      )}
      title={title}
      {...rest}
    >
      {dot ? <span className="nx-badge__dot" aria-hidden="true" /> : null}
      {icon ? <span className="nx-badge__icon" aria-hidden="true">{icon}</span> : null}
      {children ? <span className="nx-badge__text">{children}</span> : null}
    </span>
  );
}
