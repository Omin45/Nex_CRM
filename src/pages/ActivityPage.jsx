/**
 * NexERP — ActivityPage
 * ---------------------------------------------------------------------------
 * The workspace audit trail as a timeline: who did what, where from, how
 * serious it was. The feed is timeline-first because this screen answers
 * "what happened?" — a table of 60 rows makes the reader reconstruct the
 * sequence themselves.
 *
 * The fixture's severities are info/success/warning, but the severity card
 * always lists critical first so a quiet period reads as "0 critical events"
 * rather than as an omission. Counts cover the whole loaded feed, not the
 * current filter, and the card says so — a filtered timeline next to an
 * unfiltered summary is otherwise a contradiction.
 *
 * Category filtering happens client-side: one request loads all 60 rows and
 * every subsequent keystroke is a memory operation instead of a round trip.
 */

import { useMemo, useState } from 'react';
import { FiActivity, FiRefreshCw, FiSearch } from 'react-icons/fi';
import ActivityTimeline from '@/components/data-display/Timeline/ActivityTimeline';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { useGetWorkspaceActivityQuery } from '@/services/searchApi';
import { useDebounce } from '@/hooks/useDebounce';
import { useNotify } from '@/hooks/useNotification';
import './ActivityPage.css';

/* `hr` is the fixture's category for people events — the segment label is the
   human name, the value stays the wire value. `settings` rows are only
   reachable through "All", which is why the filter list is explicit here. */
const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'sales', label: 'Sales' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'hr', label: 'People' },
  { id: 'support', label: 'Support' },
  { id: 'security', label: 'Security' },
];

const CATEGORY_LABELS = {
  sales: 'Sales',
  accounting: 'Accounting',
  inventory: 'Inventory',
  hr: 'People',
  support: 'Support',
  settings: 'Settings',
  security: 'Security',
};

/* severity -> { badge tone, timeline node tone }. `critical` maps to the badge
   set's `danger` because Badge has no critical tone of its own. */
const SEVERITIES = [
  { id: 'critical', label: 'Critical', tone: 'danger' },
  { id: 'warning', label: 'Warning', tone: 'warning' },
  { id: 'success', label: 'Success', tone: 'success' },
  { id: 'info', label: 'Info', tone: 'info' },
];

const TONE_BY_SEVERITY = Object.fromEntries(SEVERITIES.map((s) => [s.id, s.tone]));
const LABEL_BY_SEVERITY = Object.fromEntries(SEVERITIES.map((s) => [s.id, s.label]));

const INITIAL_LIMIT = 15;

export default function ActivityPage() {
  const notify = useNotify();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetWorkspaceActivityQuery({
    /* The feed is small enough to hold in one page; loading it whole is what
       makes client-side filtering and whole-feed severity counts possible. */
    pageSize: 100,
  });

  const rows = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== 'all' && row.category !== category) return false;
      if (!term) return true;
      return `${row.actor} ${row.actorEmail} ${row.action} ${row.category} ${row.ip}`
        .toLowerCase()
        .includes(term);
    });
  }, [rows, category, debouncedSearch]);

  /* Rows -> the shape ActivityTimeline reads: `at` for the timestamp, `meta`
     for the secondary line, `tone`/`status` for the node and the pill. */
  const entries = useMemo(
    () =>
      filtered.map((row) => ({
        id: row.id,
        at: row.timestamp,
        actor: row.actor,
        action: row.action,
        meta: `${CATEGORY_LABELS[row.category] ?? row.category} · ${row.actorEmail} · ${row.ip}`,
        tone: TONE_BY_SEVERITY[row.severity] ?? 'neutral',
        status: {
          tone: TONE_BY_SEVERITY[row.severity] ?? 'neutral',
          label: LABEL_BY_SEVERITY[row.severity] ?? row.severityLabel ?? row.severity,
        },
      })),
    [filtered],
  );

  const severityCounts = useMemo(() => {
    const counts = {};
    rows.forEach((row) => {
      counts[row.severity] = (counts[row.severity] ?? 0) + 1;
    });
    return counts;
  }, [rows]);

  const hasFilters = category !== 'all' || debouncedSearch.trim() !== '';

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing activity feed');
  };

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-activity__error">
            <h1 className="nx-activity__error-title">Could not load the activity feed</h1>
            <p className="nx-activity__error-text">
              {error?.data?.message ?? 'The workspace audit trail is unavailable right now.'}
            </p>
            <Button onClick={refetch}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Workspace</span>
          <h1 className="page__title">Activity feed</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading activity…'
              : `${rows.length} recorded events — sales, books, stock, people and security changes in this workspace`}
          </p>
        </div>

        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh activity"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="page__body nx-activity">
        <div className="toolbar nx-activity__toolbar">
          {/* Seven segments overflow a narrow viewport, so the pill row scrolls
              horizontally instead of wrapping into an unreadable stack. */}
          <div className="nx-activity__segments">
            <div className="nx-segmented" role="group" aria-label="Filter by category">
              {CATEGORY_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`nx-segmented__item${category === filter.id ? ' is-active' : ''}`}
                  aria-pressed={category === filter.id}
                  onClick={() => {
                    setCategory(filter.id);
                    setShowAll(false);
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="toolbar__spacer" />

          <Input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setShowAll(false);
            }}
            placeholder="Search actor, action or IP"
            aria-label="Search the activity feed"
            leftIcon={<FiSearch size={15} />}
            containerClassName="nx-activity__search"
          />
        </div>

        <div className="grid grid--sidebar-right">
          <Card>
            <ActivityTimeline
              entries={entries}
              loading={isLoading}
              emptyLabel={
                hasFilters ? 'No activity matches your filters' : 'No activity recorded yet'
              }
              showAbsoluteTime
              limit={showAll ? null : INITIAL_LIMIT}
              onShowAll={() => setShowAll(true)}
            />

            {entries.length > 0 ? (
              <p className="nx-activity__count text-xs text-dim">
                Showing {entries.length} of {rows.length} events
                {hasFilters ? ' — matching the current filter' : ''}
              </p>
            ) : null}
          </Card>

          <Card className="nx-activity__summary">
            <div className="nx-activity__summary-head">
              <span className="nx-activity__summary-icon" aria-hidden="true">
                <FiActivity size={15} />
              </span>
              <div>
                <h2 className="nx-activity__summary-title">Severity summary</h2>
                <p className="nx-activity__summary-subtitle">
                  Across {rows.length} loaded events
                </p>
              </div>
            </div>

            <ul className="nx-activity__sev-list">
              {SEVERITIES.map((severity) => (
                <li key={severity.id} className="nx-activity__sev" data-severity={severity.id}>
                  <span className="nx-activity__sev-dot" aria-hidden="true" />
                  <span className="nx-activity__sev-label">{severity.label}</span>
                  <span className="nx-activity__sev-count mono">
                    {severityCounts[severity.id] ?? 0}
                  </span>
                </li>
              ))}
            </ul>

            <p className="nx-activity__summary-hint text-xs text-dim">
              {filtered.length} of {rows.length} events in view — counts above cover the whole
              feed, not the current filter.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
