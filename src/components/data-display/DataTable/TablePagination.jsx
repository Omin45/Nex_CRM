/**
 * ArkCRM — TablePagination
 * ---------------------------------------------------------------------------
 * Range summary ("1–10 of 248"), page-size select, and a windowed pager that
 * collapses long ranges to ellipses.
 */

import { PAGINATION } from '@/config/constants';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * Builds the visible page list: 1 … 4 5 [6] 7 8 … 20
 * Always shows the first and last page plus a window around the current one.
 */
function buildPageRange(current, totalPages, siblings = 1) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set([1, totalPages]);
  for (let i = current - siblings; i <= current + siblings; i += 1) {
    if (i > 1 && i < totalPages) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);

  /* Insert null wherever there is a gap larger than one page. */
  const withGaps = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) withGaps.push(null);
    withGaps.push(page);
  });

  return withGaps;
}

export default function TablePagination({
  page = PAGINATION.defaultPage,
  pageSize = PAGINATION.defaultSize,
  total = 0,
  totalPages: totalPagesProp,
  sizeOptions = PAGINATION.sizeOptions,
  onPageChange,
  onPageSizeChange,
  /** Human label for the entity, e.g. "invoices". */
  itemLabel = 'records',
  className = '',
}) {
  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageRange = buildPageRange(page, totalPages);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav className={cx('nx-pagination', className)} aria-label="Table pagination">
      {/* Range summary */}
      <p className="nx-pagination__summary" aria-live="polite">
        Showing <strong>{from.toLocaleString()}</strong>–<strong>{to.toLocaleString()}</strong> of{' '}
        <strong>{total.toLocaleString()}</strong> {itemLabel}
      </p>

      <div className="nx-pagination__controls">
        {/* Page-size control */}
        <label className="nx-pagination__size">
          <span className="nx-pagination__size-label">Rows</span>
          <select
            className="nx-pagination__select"
            value={pageSize}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
            aria-label={`Rows per page, currently ${pageSize}`}
          >
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <span className="nx-pagination__divider" aria-hidden="true" />

        <button
          type="button"
          className="nx-pagination__btn"
          onClick={() => onPageChange?.(page - 1)}
          disabled={!canPrev}
          aria-label="Previous page"
        >
          <Chevron direction="left" />
        </button>

        {pageRange.map((pageNumber, index) =>
          pageNumber === null ? (
            <span key={`gap-${index}`} className="nx-pagination__ellipsis" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={pageNumber}
              type="button"
              className={cx('nx-pagination__page', pageNumber === page && 'is-active')}
              onClick={() => onPageChange?.(pageNumber)}
              aria-current={pageNumber === page ? 'page' : undefined}
              aria-label={`Page ${pageNumber}`}
            >
              {pageNumber}
            </button>
          ),
        )}

        <button
          type="button"
          className="nx-pagination__btn"
          onClick={() => onPageChange?.(page + 1)}
          disabled={!canNext}
          aria-label="Next page"
        >
          <Chevron direction="right" />
        </button>
      </div>
    </nav>
  );
}

function Chevron({ direction }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path
        d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
