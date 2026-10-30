/**
 * NexERP — TableColumnHeader
 * ---------------------------------------------------------------------------
 * A single <th>. Renders a sort control only for sortable columns and
 * communicates the active direction to assistive technology through
 * aria-sort (never a colour change alone).
 */

import { useMemo } from 'react';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Tri-state arrow: unsorted, ascending, descending. */
function SortIcon({ state }) {
  return (
    <span className="nx-th__sort" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cx('nx-th__arrow', state === 'asc' && 'is-active nx-th__arrow--up')}
      >
        <path d="M12 19V5" />
        <path d="M6 11l6-6 6 6" className="nx-th__arrow-head" />
      </svg>
    </span>
  );
}

export default function TableColumnHeader({
  column,
  sortBy,
  sortOrder,
  onSort,
  /** Select-all checkbox lives in this cell for the selectable variant. */
  selectable = false,
  allSelected = false,
  someSelected = false,
  onToggleAll,
}) {
  const isSorted = sortBy === column.key;
  const direction = isSorted ? sortOrder : null;
  const isSortable = column.sortable !== false && Boolean(column.key) && Boolean(onSort);

  const ariaSort = useMemo(() => {
    if (!isSortable) return undefined;
    if (!isSorted) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  }, [isSortable, isSorted, sortOrder]);

  const handleClick = () => {
    if (!isSortable) return;
    /* The hook cycles asc -> desc -> unsorted. */
    onSort(column.key);
  };

  /* Keyboard support: Enter/Space on a focusable header button. */
  const handleKeyDown = (event) => {
    if (!isSortable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <th
      className={cx(
        'nx-th',
        column.align && `nx-th--${column.align}`,
        column.headerClassName,
        isSortable && 'nx-th--sortable',
        isSorted && 'is-sorted',
      )}
      scope="col"
      style={column.width ? { width: column.width } : undefined}
      aria-sort={ariaSort}
    >
      {selectable ? (
        <label className="nx-th__checkbox" title="Select all rows on this page">
          <input
            type="checkbox"
            checked={allSelected}
            /* Indeterminate is not expressible as a JSX attribute, so it is
               set on the DOM node through a ref callback. */
            ref={(node) => {
              if (node) node.indeterminate = !allSelected && someSelected;
            }}
            onChange={onToggleAll}
            aria-label="Select all rows on this page"
          />
          <span className="nx-checkbox__box" aria-hidden="true" />
        </label>
      ) : null}

      {isSortable ? (
        <button
          type="button"
          className="nx-th__button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <span className="nx-th__label">{column.header}</span>
          <SortIcon state={direction} />
        </button>
      ) : (
        <span className="nx-th__label">{column.header}</span>
      )}
    </th>
  );
}
