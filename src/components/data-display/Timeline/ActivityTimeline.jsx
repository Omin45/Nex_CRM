/**
 * NexERP — ActivityTimeline
 * ---------------------------------------------------------------------------
 * Vertical feed for audit trails and activity history: the dashboard's
 * "recent activity" panel, a customer's 360 timeline, an order's status
 * history.
 *
 * Each entry renders a coloured node on a continuous rail, with the actor,
 * the action verb and the subject. Tone comes from the entry so the same
 * component can express a payment (green), a stock alert (amber) and a
 * neutral system event.
 *
 * @example
 * <ActivityTimeline
 *   entries={activity}
 *   emptyLabel="No activity in the last 30 days"
 *   onSelect={(entry) => navigate(entry.to)}
 * />
 */

import Badge from '@/components/ui/Badge/Badge';
import { fromNow, formatDateTime } from '@/utils/date';
import './Timeline.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Icon glyph per tone, so the rail is readable without relying on colour. */
const TONE_GLYPH = {
  success: '✓',
  danger: '!',
  warning: '▲',
  info: 'i',
  neutral: '•',
  accent: '◆',
  violet: '◆',
};

export default function ActivityTimeline({
  entries = [],
  loading = false,
  emptyLabel = 'No activity recorded yet',
  /** Show the absolute timestamp under the relative one. */
  showAbsoluteTime = false,
  /** Renders entries as buttons. */
  onSelect = null,
  /** Caps the visible list with a "show all" affordance. */
  limit = null,
  onShowAll = null,
  className = '',
}) {
  if (loading) {
    return (
      <div className={cx('nx-timeline', className)}>
        {Array.from({ length: 4 }, (_, i) => (
          <div className="nx-timeline__item" key={i}>
            <span className="nx-timeline__node nx-timeline__node--skeleton" />
            <div className="nx-timeline__content">
              <div className="skeleton skeleton--text" style={{ width: '75%' }} />
              <div className="skeleton skeleton--text" style={{ width: '45%', marginTop: 6 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!entries?.length) {
    return (
      <div className={cx('nx-timeline', 'nx-timeline--empty', className)}>
        <p className="text-sm text-dim">{emptyLabel}</p>
      </div>
    );
  }

  const visible = limit ? entries.slice(0, limit) : entries;
  const hiddenCount = limit ? entries.length - visible.length : 0;

  return (
    <div className={cx('nx-timeline', className)}>
      {visible.map((entry, index) => {
        const tone = entry.tone ?? 'neutral';
        const isLast = index === visible.length - 1 && hiddenCount <= 0;

        const Wrapper = onSelect ? 'button' : 'div';

        return (
          <Wrapper
            key={entry.id ?? `${entry.at}-${index}`}
            className={cx('nx-timeline__item', onSelect && 'is-interactive')}
            onClick={onSelect ? () => onSelect(entry) : undefined}
            type={onSelect ? 'button' : undefined}
            title={showAbsoluteTime ? formatDateTime(entry.at) : undefined}
          >
            {/* Node + rail. The rail is a pseudo-element so the last entry's
                rail can be suppressed with .is-last. */}
            <span className={cx('nx-timeline__rail-wrap', isLast && 'is-last')}>
              <span
                className={cx('nx-timeline__node', `nx-timeline__node--${tone}`)}
                aria-hidden="true"
              >
                {TONE_GLYPH[tone] ?? TONE_GLYPH.neutral}
              </span>
            </span>

            <div className="nx-timeline__content">
              <p className="nx-timeline__text">
                {entry.actor ? <strong>{entry.actor}</strong> : null}
                {entry.actor && entry.action ? ' ' : null}
                <span className="nx-timeline__action">{entry.action}</span>
                {entry.target ? <strong className="nx-timeline__target">{entry.target}</strong> : null}
              </p>

              {entry.meta ? <p className="nx-timeline__meta">{entry.meta}</p> : null}

              <div className="nx-timeline__foot">
                <time
                  className="nx-timeline__time"
                  dateTime={entry.at}
                  title={formatDateTime(entry.at)}
                >
                  {fromNow(entry.at)}
                </time>

                {entry.status ? (
                  <Badge tone={entry.status.tone} size="xs">
                    {entry.status.label}
                  </Badge>
                ) : null}

                {entry.to ? (
                  <span className="nx-timeline__link" aria-hidden="true">
                    View →
                  </span>
                ) : null}
              </div>
            </div>
          </Wrapper>
        );
      })}

      {hiddenCount > 0 && onShowAll ? (
        <button type="button" className="nx-timeline__more" onClick={onShowAll}>
          Show {hiddenCount} more
        </button>
      ) : null}
    </div>
  );
}
