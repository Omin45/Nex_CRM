/**
 * ArkCRM — useDataTable
 * ---------------------------------------------------------------------------
 * The state controller behind <DataTable>. Owns search, sorting, filtering,
 * pagination and column visibility, and returns a single `queryParams` object
 * ready to hand to an RTK Query endpoint.
 *
 * Keeping this logic in a hook (rather than inside the table component) means a
 * Kanban board, an export sheet or a future server-side table can reuse the
 * exact same filter semantics.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PAGINATION, STORAGE_KEYS } from '@/config/constants';
import { useDebounce } from './useDebounce';

const COLUMN_PREFS_KEY = STORAGE_KEYS.tablePreferences;

/** Loads per-table column visibility, keyed by table name. */
function loadColumnPrefs(tableName) {
  try {
    const all = JSON.parse(localStorage.getItem(COLUMN_PREFS_KEY) ?? '{}');
    return all?.[tableName] ?? null;
  } catch {
    return null;
  }
}

function saveColumnPrefs(tableName, prefs) {
  try {
    const all = JSON.parse(localStorage.getItem(COLUMN_PREFS_KEY) ?? '{}');
    localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify({ ...all, [tableName]: prefs }));
  } catch {
    /* Private-mode quota errors are non-fatal. */
  }
}

export function useDataTable(options = {}) {
  const {
    tableName = 'default',
    initialPageSize = PAGINATION.defaultSize,
    /** Columns marked sortable are the only ones the header will offer. */
    columns = [],
    /** Filters applied on the server and reflected in the query params. */
    initialFilters = {},
    /** Extra params merged into every request (e.g. a fixed warehouseId). */
    fixedParams = {},
    /** Enables the debounced free-text search. */
    searchable = true,
    searchDebounce = 300,
  } = options;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(PAGINATION.defaultPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState(initialFilters);
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(
    () => loadColumnPrefs(tableName)?.visible ?? columns.map((c) => c.key),
  );

  /* Only the debounced term reaches the query params, so typing does not
     trigger a request per keystroke. */
  const debouncedSearch = useDebounce(search, searchDebounce);

  /* A new search or filter invalidates the current offset. */
  useEffect(() => {
    setPage(PAGINATION.defaultPage);
  }, [debouncedSearch, filters, pageSize]);

  /* Persist column visibility so a user's layout survives a reload. */
  const updateVisibleColumns = useCallback(
    (next) => {
      setVisibleColumns((current) => {
        const resolved = typeof next === 'function' ? next(current) : next;
        saveColumnPrefs(tableName, { visible: resolved });
        return resolved;
      });
    },
    [tableName],
  );

  /** Cycles a column through asc -> desc -> unsorted. */
  const toggleSort = useCallback(
    (key) => {
      setSortBy((currentKey) => {
        if (currentKey !== key) {
          setSortOrder('asc');
          return key;
        }
        if (sortOrder === 'asc') {
          setSortOrder('desc');
          return key;
        }
        /* Third click clears the sort. */
        setSortOrder('asc');
        return null;
      });
    },
    [sortOrder],
  );

  const setFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => setFilters(initialFilters), [initialFilters]);
  const clearSearch = useCallback(() => setSearch(''), []);

  const resetTable = useCallback(() => {
    setSearch('');
    setPage(PAGINATION.defaultPage);
    setPageSize(initialPageSize);
    setSortBy(null);
    setSortOrder('asc');
    setFilters(initialFilters);
    setSelectedIds([]);
  }, [initialPageSize, initialFilters]);

  /* ---- row selection (bulk actions in the table toolbar) ---- */
  const toggleRowSelection = useCallback((id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }, []);

  const toggleAllVisible = useCallback(
    (visibleIds) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
      setSelectedIds(allSelected ? [] : visibleIds);
    },
    [selectedIds],
  );

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  /** Filters with a value set — drives the "3 filters active" chip. */
  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== undefined && v !== null && v !== '').length,
    [filters],
  );

  const hasActiveControls = useMemo(
    () => Boolean(debouncedSearch) || activeFilterCount > 0,
    [debouncedSearch, activeFilterCount],
  );

  /** Hand this straight to an RTK Query endpoint's `params` option. */
  const queryParams = useMemo(
    () => ({
      ...fixedParams,
      ...(searchable && debouncedSearch ? { search: debouncedSearch } : {}),
      ...(sortBy ? { sortBy, sortOrder } : {}),
      page,
      pageSize,
      ...Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      ),
    }),
    [fixedParams, searchable, debouncedSearch, sortBy, sortOrder, page, pageSize, filters],
  );

  /* Pagination helpers. */
  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(PAGINATION.defaultPage, p - 1)), []);
  const goToPage = useCallback((n) => setPage(Math.max(1, Number(n) || 1)), []);
  const changePageSize = useCallback((size) => {
    setPageSize(Math.min(PAGINATION.maxSize, Number(size) || PAGINATION.defaultSize));
  }, []);

  return {
    // state
    search,
    debouncedSearch,
    page,
    pageSize,
    sortBy,
    sortOrder,
    filters,
    selectedIds,
    visibleColumns,
    // derived
    queryParams,
    activeFilterCount,
    hasActiveControls,
    isFiltered: hasActiveControls,
    // setters
    setSearch,
    setPage,
    setPageSize,
    setFilters,
    setFilter,
    setSortBy,
    setSortOrder,
    toggleSort,
    changePageSize,
    // pagination
    nextPage,
    prevPage,
    goToPage,
    // selection
    toggleRowSelection,
    toggleAllVisible,
    clearSelection,
    // columns
    setVisibleColumns: updateVisibleColumns,
    toggleColumn: useCallback(
      (key) => {
        updateVisibleColumns((current) =>
          current.includes(key) ? current.filter((c) => c !== key) : [...current, key],
        );
      },
      [updateVisibleColumns],
    ),
    // resets
    clearSearch,
    clearFilters,
    resetTable,
  };
}

export default useDataTable;
