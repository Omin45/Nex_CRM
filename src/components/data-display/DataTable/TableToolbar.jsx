/**
 * NexERP — TableToolbar
 * ---------------------------------------------------------------------------
 * The strip above a DataTable: free-text search, quick filter pills, a column
 * visibility menu and a refresh control. Wired to useDataTable so every list
 * screen gets the same filter semantics without re-implementing them.
 *
 * @example
 * <TableToolbar
 *   search={search} onSearch={setSearch}
 *   onRefresh={refetch} isFetching={isFetching}
 *   filters={[
 *     { key: 'status', label: 'Status', value: filters.status,
 *       options: [{ value: '', label: 'All' }, { value: 'PAID', label: 'Paid' }] },
 *   ]}
 *   onFilterChange={setFilter}
 *   columns={columns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn}
 * />
 */

import { useMemo, useRef, useState } from 'react';
import { FiCheck, FiRefreshCw, FiSearch, FiSliders, FiX } from 'react-icons/fi';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import { useOutsideClick, useEscapeKey } from '@/hooks/useOutsideClick';
import './TableToolbar.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export default function TableToolbar({
  search = '',
  onSearch = () => {},
  searchPlaceholder = 'Search…',
  filters = [],
  onFilterChange = () => {},
  onClearFilters = null,
  activeFilterCount = 0,
  columns = [],
  visibleColumns = null,
  onToggleColumn = null,
  onRefresh = null,
  isFetching = false,
  children = null,
}) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef(null);

  const closeColumns = () => setColumnsOpen(false);
  useOutsideClick(closeColumns, columnsRef, columnsOpen);
  useEscapeKey(closeColumns, columnsOpen);

  /* Only offer a column the caller marked hideable, and never let the user
     hide the first (identity) column — a row with no visible cells is a bug,
     not a preference. */
  const hideableColumns = useMemo(
    () => columns.filter((column) => column.hideable !== false && column.key !== columns[0]?.key),
    [columns],
  );

  const handleFilter = (key, value) => {
    onFilterChange(key, value);
  };

  return (
    <div className="nx-ttool">
      <div className="nx-ttool__left">
        <div className="nx-ttool__search">
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder}
            leftIcon={<FiSearch size={15} />}
            aria-label={searchPlaceholder}
            fullWidth
            /* The visible <label> is omitted; the placeholder and aria-label
               carry the meaning. */
            containerClassName="nx-ttool__field"
          />
        </div>

        {filters.map((filter) => (
          <div className="nx-ttool__filter" key={filter.key}>
            {filter.label ? (
              <span className="nx-ttool__filter-label">{filter.label}</span>
            ) : null}

            <div className="nx-segmented" role="group" aria-label={filter.label ?? filter.key}>
              {filter.options.slice(0, 4).map((option) => {
                const isActive = String(filter.value ?? '') === String(option.value);
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    className={cx('nx-segmented__item', isActive && 'is-active')}
                    aria-pressed={isActive}
                    onClick={() => handleFilter(filter.key, option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {onClearFilters && activeFilterCount > 0 ? (
          <button type="button" className="nx-link nx-link--sm" onClick={onClearFilters}>
            <FiX size={12} aria-hidden="true" />
            Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
          </button>
        ) : null}
      </div>

      {/* Page-level controls supplied by the caller (e.g. "New invoice"). */}
      {children ? <div className="nx-ttool__center">{children}</div> : null}

      <div className="nx-ttool__right">
        {onRefresh ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label="Refresh"
            title="Refresh"
            className={isFetching ? 'is-spinning' : ''}
          >
            <FiRefreshCw size={15} />
          </Button>
        ) : null}

        {hideableColumns.length > 0 && onToggleColumn ? (
          <div className="nx-nav-menu-anchor" ref={columnsRef}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<FiSliders size={14} />}
              onClick={() => setColumnsOpen((prev) => !prev)}
              aria-expanded={columnsOpen}
              aria-haspopup="true"
            >
              Columns
            </Button>

            {columnsOpen ? (
              <div className="nx-dropdown nx-dropdown--left" style={{ width: 240 }} role="menu">
                <div className="nx-dropdown__header">
                  <span className="nx-dropdown__title">Visible columns</span>
                </div>

                <div className="nx-ttool__columns">
                  {hideableColumns.map((column) => {
                    const isVisible = !visibleColumns || visibleColumns.includes(column.key);
                    return (
                      <button
                        key={column.key}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={isVisible}
                        className="nx-menu-item"
                        onClick={() => onToggleColumn(column.key)}
                      >
                        <span className="nx-menu-item__icon" aria-hidden="true" style={{ width: 20 }}>
                          {isVisible ? <FiCheck size={13} /> : null}
                        </span>
                        <span className="nx-menu-item__body">
                          <span className="nx-menu-item__title">{column.header}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {onClearFilters && activeFilterCount > 0 ? (
          <Badge tone="accent" size="sm" title="Active filters">
            {activeFilterCount} active
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
