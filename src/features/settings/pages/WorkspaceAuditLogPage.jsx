/**
 * NexERP — WorkspaceAuditLogPage
 * ---------------------------------------------------------------------------
 * `settings/audit-log` — who did what in this workspace, when and from where.
 * Reads the one endpoint settingsApi actually serves (`GET /settings/audit-log`)
 * and lets the server do the work: search, ordering and paging all go into the
 * query. It sends `sortBy`/`sortOrder` rather than a bare `sort`, because the
 * mock treats unknown keys as exact-match filters — one wrong key empties it.
 *
 * Density and default page size come from PreferencesSettingsPage's stored
 * blob (the reader is duplicated; only these six files may be added), and the
 * footer pager is hand-built so it can say "Page X of Y" literally.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle, FiChevronLeft, FiChevronRight, FiRefreshCw, FiShield,
} from 'react-icons/fi';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import { useGetAuditLogQuery } from '@/features/settings/api/settingsApi';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDateTime, fromNow } from '@/utils/date';
import './WorkspaceAuditLogPage.css';

const PREFS_KEY = 'nexerp.ui.preferences';

const PAGE_SIZES = [10, 20];

const SORT_OPTIONS = [
  { value: 'timestamp:desc', label: 'Newest first' },
  { value: 'timestamp:asc', label: 'Oldest first' },
  { value: 'actor:asc', label: 'Actor A–Z' },
];

const SEVERITY_TONES = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
  success: 'success',
};

/**
 * Reads the blob PreferencesSettingsPage writes. Guarded and lazy so a render
 * outside a browser (the smoke harness) never touches localStorage, and so the
 * page parses it once per mount instead of once per render.
 */
function readPreferences() {
  if (typeof localStorage === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? null;
  } catch {
    return null;
  }
}

export default function WorkspaceAuditLogPage() {
  const [prefs] = useState(readPreferences);
  const [pageSize, setPageSize] = useState(() => {
    const stored = Number(prefs?.defaultPageSize);
    return PAGE_SIZES.includes(stored) ? stored : PAGE_SIZES[0];
  });

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  const params = useMemo(() => ({
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    sortBy,
    sortOrder,
    page,
    pageSize,
  }), [debouncedSearch, sortBy, sortOrder, page, pageSize]);

  const { data, isLoading, isUninitialized, isFetching, isError, error, refetch } = useGetAuditLogQuery(params);

  /* Uninitialised counts as loading: until the query subscribes there is no
     data, and a frame of "No events recorded yet" before the skeleton is a
     lie the screen should not tell. */
  const showLoading = isUninitialized || isLoading;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const isFiltered = Boolean(debouncedSearch.trim());

  /* A fresh term or a fresh page size starts over… */
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  /* …and a server that answered with fewer pages than we asked for pulls the
     footer back inside the range instead of stranding it on an empty screen. */
  useEffect(() => {
    if (data?.totalPages && page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data?.totalPages, page]);

  /* No `sortable` flags and no onSort on the table: ordering is the toolbar's
     job here, so the headers stay plain labels rather than dead-looking
     sort controls. */
  const columns = useMemo(() => [
    {
      key: 'action',
      header: 'Event',
      render: (row) => (
        <div className="nx-set-audit__event">
          <span className="nx-set-audit__category">{row.category}</span>
          <span className="nx-set-audit__action">{row.action}</span>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (row) => (
        <div className="nx-set-audit__ident">
          <span className="nx-set-audit__name">{row.actor}</span>
          <span className="nx-set-audit__meta">{row.actorEmail}</span>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => (
        <Badge tone={SEVERITY_TONES[row.severity] ?? 'neutral'} dot>
          {row.severityLabel ?? row.severity}
        </Badge>
      ),
    },
    {
      key: 'timestamp',
      header: 'When',
      align: 'right',
      render: (row) => (
        <div className="nx-set-audit__when">
          <span className="nx-set-audit__name">{formatDateTime(row.timestamp)}</span>
          <span className="nx-set-audit__meta">{fromNow(row.timestamp)}</span>
        </div>
      ),
    },
    {
      key: 'origin',
      header: 'Origin',
      render: (row) => (
        <div className="nx-set-audit__ident">
          <span className="nx-set-audit__meta">{row.ip}</span>
          <span className="nx-set-audit__meta nx-set-audit__meta--truncate">{row.userAgent}</span>
        </div>
      ),
    },
  ], []);

  const handleSortChange = (key, value) => {
    if (key !== 'sort') return;
    const [field, order] = value.split(':');
    setSortBy(field);
    setSortOrder(order === 'asc' ? 'asc' : 'desc');
  };

  /* Hooks above this line, early return below: the error screen must not
     skip a single one of them. */
  if (isError && !data) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Workspace</span>
            <h1 className="page__title">Audit log</h1>
            <p className="page__subtitle">The workspace audit trail is unavailable right now.</p>
          </div>
        </div>
        <div className="page__body">
          <Card padding="lg">
            <div className="nx-set-audit__error">
              <h2 className="nx-set-audit__error-title">Could not load the audit log</h2>
              <p className="nx-set-audit__error-text">
                {error?.data?.message
                  ?? 'The settings audit-log endpoint did not respond. Try again in a moment.'}
              </p>
              <Button leftIcon={<FiRefreshCw size={15} />} onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Workspace</span>
          <h1 className="page__title">Audit log</h1>
          <p className="page__subtitle">
            {showLoading
              ? 'Loading the audit trail…'
              : `${total} ${total === 1 ? 'event' : 'events'} recorded in this workspace — who did what, when and from where.`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !showLoading ? 'nx-spin' : ''} />}
            onClick={() => refetch()}
            aria-label="Refresh audit log"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="page__body">
        {isError && data ? (
          <div className="nx-alert nx-alert--error nx-set-audit__refetch-error" role="alert">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiAlertTriangle size={16} />
            </span>
            Could not refresh — showing the last rows that loaded.
            {error?.data?.message ? ` (${error.data.message})` : ''}
          </div>
        ) : null}

        <Card padding="none">
          <TableToolbar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Actor, action, category or IP"
            filters={[{ key: 'sort', label: 'Order', value: `${sortBy}:${sortOrder}`, options: SORT_OPTIONS }]}
            onFilterChange={handleSortChange}
            onClearFilters={search ? () => setSearch('') : null}
            activeFilterCount={search ? 1 : 0}
            onRefresh={() => refetch()}
            isFetching={isFetching}
          />

          <DataTable
            columns={columns}
            data={data?.items ?? []}
            loading={showLoading || isFetching}
            skeleton={showLoading}
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            hidePagination
            itemLabel="events"
            dense={prefs?.density === 'compact'}
            caption="Workspace audit log: event, actor, severity, time and origin"
            isFiltered={isFiltered}
            emptyIcon={<FiShield />}
            emptyTitle="No events recorded yet"
            emptyDescription="Actions taken in this workspace appear here as soon as anyone signs in or changes a record."
          />

          {total > 0 ? (
            <nav className="nx-set-audit__pager" aria-label="Audit log pages">
              <p className="nx-set-audit__pager-count" aria-live="polite">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                <span className="nx-set-audit__pager-total">
                  {' '}
                  · {total} {total === 1 ? 'event' : 'events'} in total
                </span>
              </p>

              <div className="nx-set-audit__pager-controls">
                <label className="nx-set-audit__pager-size">
                  <span>Rows</span>
                  <select
                    className="nx-set-audit__pager-select"
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    aria-label={`Events per page, currently ${pageSize}`}
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<FiChevronLeft size={14} />}
                  disabled={page <= 1 || showLoading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  rightIcon={<FiChevronRight size={14} />}
                  disabled={page >= totalPages || showLoading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </nav>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
