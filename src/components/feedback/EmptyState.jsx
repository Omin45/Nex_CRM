/**
 * ArkCRM — EmptyState
 * ---------------------------------------------------------------------------
 * The "there is nothing here yet" surface. Also used for filtered-to-zero
 * results, where the copy and the action change.
 *
 * @example
 * <EmptyState
 *   icon={<FiInbox />}
 *   title="No invoices yet"
 *   description="Create your first invoice and it will appear here."
 *   action={<Button onClick={open}>Create invoice</Button>}
 * />
 */

import './Feedback.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export default function EmptyState({
  icon = null,
  title = 'Nothing here yet',
  description = 'When there is data to show, it will appear here.',
  action = null,
  secondaryAction = null,
  /** `true` renders the "no results for your filters" variant. */
  filtered = false,
  className = '',
  children,
}) {
  return (
    <div className={cx('nx-empty', className)}>
      {icon ? <span className="nx-empty__icon" aria-hidden="true">{icon}</span> : null}

      <h3 className="nx-empty__title">
        {filtered ? 'No matching results' : title}
      </h3>

      <p className="nx-empty__description">
        {filtered
          ? 'No records match the current filters. Try broadening your search or clearing a filter.'
          : description}
      </p>

      {action || secondaryAction ? (
        <div className="nx-empty__actions">
          {action}
          {secondaryAction}
        </div>
      ) : null}

      {children}
    </div>
  );
}
