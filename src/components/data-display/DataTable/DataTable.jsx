/**
 * NexERP — DataTable
 * ---------------------------------------------------------------------------
 * The master data table behind every list screen in NexERP (customers,
 * invoices, products, employees, tickets …).
 *
 * Design goals:
 *  - dark glass surface with glowing hover rows
 *  - a sticky header that stays legible while the body scrolls
 *  - a filter bar with a blue-accent search field and soft status pills
 *  - server-driven pagination / sorting / search, but also usable with a plain
 *    in-memory array (pass `data` and let the component sort locally)
 *  - column-level rendering, so a column can hold a Badge, an avatar, money or
 *    a row-action menu without the table knowing about any of those types
 *
 * @example
 * <DataTable
 *   columns={columns}
 *   data={customers}
 *   total={meta?.total}
 *   page={page}
 *   pageSize={pageSize}
 *   sortBy={sortBy}
 *   sortOrder={sortOrder}
 *   onSort={toggleSort}
 *   onPageChange={goToPage}
 *   onPageSizeChange={changePageSize}
 *   selectable
 *   selectedIds={selectedIds}
 *   onToggleSelect={toggleRowSelection}
 *   onToggleAll={toggleAllVisible}
 *   onRowClick={(row) => navigate(`/customers/${row.id}`)}
 *   emptyIcon={<FiUsers />}
 *   emptyAction={<Button onClick={open}>Add customer</Button>}
 *   toolbar={<FilterBar ... />}
 * />
 */

import { useCallback, useMemo } from 'react';
import TableColumnHeader from './TableColumnHeader';
import TablePagination from './TablePagination';
import LoadingState, { TableSkeletonRows } from '@/components/feedback/LoadingState';
import EmptyState from '@/components/feedback/EmptyState';
import './DataTable.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * Local comparator for the in-memory (unpaginated) mode.
 * Numeric-aware so columns holding numbers sort numerically.
 */
function compare(a, b, key, order) {
  const av = a?.[key];
  const bv = b?.[key];
  const dir = order === 'desc' ? -1 : 1;

  if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
  return String(av ?? '').localeCompare(String(bv ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  }) * dir;
}

export default function DataTable({
  columns = [],
  /** Rows for this page. */
  data = [],
  loading = false,
  /** First-load skeleton vs. a subtle refetch indicator. */
  skeleton = true,
  error = null,
  onRetry = null,

  // pagination (omit for a single, client-side table)
  page = 1,
  pageSize = 10,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'records',
  hidePagination = false,

  // sorting
  sortBy,
  sortOrder = 'asc',
  onSort,

  // selection
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onToggleAll,

  // interaction
  onRowClick,
  rowKey = (row) => row.id,
  /** Extra class per row, e.g. to tint an overdue invoice. */
  rowClassName,
  /** Sort and slice a plain array locally when no server is involved. */
  clientSide = false,
  dense = false,
  stickyHeader = true,
  zebra = false,

  // chrome
  toolbar = null,
  /** Rendered above the pagination bar when rows are selected. */
  bulkActions = null,
  emptyIcon = null,
  emptyTitle,
  emptyDescription,
  emptyAction,
  /** True when the table is empty *because of filters*, not because it is new. */
  isFiltered = false,
  footer = null,
  className = '',
  caption = null,
}) {
  /* ---- client-side mode: sort and paginate in memory ---------------- */
  const rows = useMemo(() => {
    if (!clientSide) return data;
    const sorted = sortBy ? [...data].sort((a, b) => compare(a, b, sortBy, sortOrder)) : data;
    if (hidePagination || !onPageChange) return sorted;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [data, clientSide, sortBy, sortOrder, hidePagination, onPageChange, page, pageSize]);

  const resolvedTotal = total ?? data.length;
  const visibleIds = useMemo(() => rows.map((row, i) => rowKey(row, i)), [rows, rowKey]);

  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someSelected = visibleIds.some((id) => selectedIds.includes(id));

  const handleToggleAll = useCallback(() => {
    onToggleAll?.(visibleIds);
  }, [onToggleAll, visibleIds]);

  const hasRows = rows.length > 0;
  const showEmpty = !loading && !error && !hasRows;

  return (
    <div className={cx('nx-table-wrap', className)}>
      {toolbar ? <div className="nx-table__toolbar">{toolbar}</div> : null}

      {/* Bulk action bar slides in only while rows are selected. */}
      {selectable && selectedIds.length > 0 && bulkActions ? (
        <div className="nx-table__bulk" role="region" aria-label="Bulk actions">
          <span className="nx-table__bulk-count">
            <strong>{selectedIds.length}</strong> selected
          </span>
          <div className="nx-table__bulk-actions">{bulkActions}</div>
        </div>
      ) : null}

      <div className={cx('nx-table__scroll', stickyHeader && 'nx-table__scroll--sticky')}>
        <table className={cx('nx-table', dense && 'nx-table--dense', zebra && 'nx-table--zebra')}>
          {caption ? <caption className="nx-sr-only">{caption}</caption> : null}

          <thead>
            <tr>
              {selectable ? (
                <TableColumnHeader
                  column={{ key: '__select', header: '' }}
                  selectable
                  allSelected={allSelected}
                  someSelected={someSelected}
                  onToggleAll={handleToggleAll}
                />
              ) : null}

              {columns.map((column) => (
                <TableColumnHeader
                  key={column.key ?? column.header}
                  column={column}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {/* First load: full skeleton body. */}
            {loading && skeleton ? (
              <TableSkeletonRows columns={columns.length + (selectable ? 1 : 0)} rows={pageSize} />
            ) : null}

            {/* Refetch: keep the old rows visible, just dimmed. */}
            {loading && !skeleton && hasRows ? (
              <>
                {rows.map((row, index) => (
                  <TableRow
                    key={rowKey(row, index)}
                    row={row}
                    index={index}
                    columns={columns}
                    selectable={selectable}
                    selected={selectedIds.includes(rowKey(row, index))}
                    onToggleSelect={onToggleSelect}
                    onRowClick={onRowClick}
                    rowClassName={rowClassName}
                    dimmed
                  />
                ))}
              </>
            ) : null}

            {!loading
              ? rows.map((row, index) => (
                  <TableRow
                    key={rowKey(row, index)}
                    row={row}
                    index={index}
                    columns={columns}
                    selectable={selectable}
                    selected={selectedIds.includes(rowKey(row, index))}
                    onToggleSelect={onToggleSelect}
                    onRowClick={onRowClick}
                    rowClassName={rowClassName}
                  />
                ))
              : null}
          </tbody>

          {footer ? <tfoot>{footer}</tfoot> : null}
        </table>
      </div>

      {/* Error takes precedence over the empty state. */}
      {error ? (
        <div className="nx-table__message">
          <p className="text-sm text-danger">{error}</p>
          {onRetry ? (
            <button type="button" className="chip" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {showEmpty ? (
        <EmptyState
          filtered={isFiltered}
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : null}

      {/* A slim progress line during a refetch, so the table does not jump. */}
      {loading && !skeleton && hasRows ? <div className="nx-table__progress" aria-hidden="true" /> : null}

      {!hidePagination && hasRows ? (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={resolvedTotal}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={itemLabel}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * ROW
 * Kept as a component so DataTable itself stays readable; memoised because a
 * refetch re-renders every row and only the changed ones need to repaint.
 * ---------------------------------------------------------------------- */
function TableRow({
  row, index, columns, selectable, selected, onToggleSelect, onRowClick, rowClassName, dimmed,
}) {
  const id = row.id ?? index;
  const isInteractive = Boolean(onRowClick);

  const handleKeyDown = (event) => {
    if (!isInteractive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <tr
      className={cx(
        'nx-table__row',
        selected && 'is-selected',
        isInteractive && 'is-clickable',
        dimmed && 'is-dimmed',
        rowClassName?.(row),
      )}
      onClick={isInteractive ? () => onRowClick(row) : undefined}
      onKeyDown={handleKeyDown}
      /* A clickable row is a real control for keyboard users. */
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? 'button' : undefined}
      aria-selected={selectable ? selected : undefined}
    >
      {selectable ? (
        <td className="nx-table__cell nx-table__cell--select">
          <label className="nx-checkbox" onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(id)}
              aria-label={`Select row ${id}`}
            />
            <span className="nx-checkbox__box" aria-hidden="true" />
          </label>
        </td>
      ) : null}

      {columns.map((column, colIndex) => (
        <td
          key={column.key ?? colIndex}
          /* The header doubles as the row label when the table reflows into
             stacked cards on phones (see DataTable.css). */
          data-label={column.header}
          data-primary={colIndex === 0 ? '' : undefined}
          className={cx(
            'nx-table__cell',
            column.align && `nx-table__cell--${column.align}`,
            column.cellClassName,
          )}
        >
          {column.render
            ? column.render(row, index)
            : column.value
              ? column.value(row)
              : row[column.key]}
        </td>
      ))}
    </tr>
  );
}
