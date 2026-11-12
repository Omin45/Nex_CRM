/**
 * ArkCRM — NotificationsPage
 * ---------------------------------------------------------------------------
 * The full-page version of the bell menu: same cache entry, same row
 * conventions (glyph, title, body, relative time), but with the three numbers
 * that matter — unread, received today, and things that need *you* — above the
 * table and a filter that separates the two states.
 *
 * Unread rows are tinted AND carry a "New" pill, because a background colour
 * alone is invisible to anyone who cannot see it, and unread rows are exactly
 * the ones people scan for. The KPI values are derived from the page of rows on
 * screen rather than from an aggregate endpoint, so every hint says so.
 */

import { useMemo, useState } from 'react';
import { FiBell, FiCheck, FiClock, FiMessageCircle } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import MetricCard from '@/features/dashboard/components/MetricCard';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from '@/features/notifications/api/notificationsApi';
import useDataTable from '@/hooks/useDataTable';
import { useNotify } from '@/hooks/useNotification';
import { formatDate, fromNow } from '@/utils/date';
import './NotificationsPage.css';
import { serverMessage } from '@/utils/errorMessage';

const READ_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

/* Category -> tone + glyph, lifted from the bell menu so the two surfaces
   never disagree about what a "stock" notification looks like. The glyph keeps
   categories distinguishable without relying on colour. */
const TYPE_META = {
  payment: { tone: 'success', glyph: '✓', label: 'Payment' },
  stock: { tone: 'danger', glyph: '▣', label: 'Stock' },
  invoice: { tone: 'warning', glyph: '₦', label: 'Invoice' },
  lead: { tone: 'accent', glyph: '◆', label: 'Lead' },
  ticket: { tone: 'info', glyph: '◈', label: 'Ticket' },
  order: { tone: 'info', glyph: '◈', label: 'Order' },
  support: { tone: 'violet', glyph: '?', label: 'Support' },
  system: { tone: 'neutral', glyph: '•', label: 'System' },
};

/* "Needs your action" is a content pattern, not a field in the fixture:
   a ticket handed to you, an @mention, something flagged for review. */
const ACTION_REQUIRED = /@|\b(action required|assigned to you|needs you|mention|review)\b/i;

export default function NotificationsPage() {
  const notify = useNotify();
  const [readFilter, setReadFilter] = useState('all');

  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllReadMutation();

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Notification',
        render: (item) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.system;
          return (
            <div className="nx-notif__cell">
              <span className="nx-notif__glyph" aria-hidden="true">
                {meta.glyph}
              </span>
              <span className="nx-notif__copy">
                <span className="nx-notif__row-title">{item.title}</span>
                <span className="nx-notif__row-body">{item.body}</span>
              </span>
            </div>
          );
        },
      },
      {
        key: 'type',
        header: 'Type',
        render: (item) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.system;
          return <Badge tone={meta.tone}>{meta.label}</Badge>;
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (item) =>
          item.read ? (
            <span className="nx-notif__state">Read</span>
          ) : (
            <Badge tone="accent" dot>
              New
            </Badge>
          ),
      },
      {
        key: 'createdAt',
        header: 'Received',
        align: 'right',
        sortable: true,
        render: (item) => (
          <span className="nx-notif__time">
            <span className="nx-notif__time-date">{formatDate(item.createdAt)}</span>
            <span className="nx-notif__time-ago">{fromNow(item.createdAt)}</span>
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        hideable: false,
        render: (item) =>
          item.read ? (
            <span className="nx-notif__none" aria-hidden="true">
              —
            </span>
          ) : (
            <button
              type="button"
              className="nx-link"
              onClick={() => markRead(item.id)}
              aria-label={`Mark "${item.title}" as read`}
            >
              Mark read
            </button>
          ),
      },
    ],
    [markRead],
  );

  const table = useDataTable({
    tableName: 'notifications',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetNotificationsQuery(
    table.queryParams,
  );

  /* Read/unread stays client-side: it composes with the server-side search
     instead of competing with it, and the mock treats every unknown param as an
     exact-match filter — which a boolean would never satisfy reliably. */
  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (readFilter === 'all') return items;
    return items.filter((item) => (readFilter === 'unread' ? !item.read : item.read));
  }, [data, readFilter]);

  const kpis = useMemo(() => {
    const items = data?.items ?? [];
    const todayKey = new Date().toDateString();
    const unread = items.filter((item) => !item.read).length;
    const today = items.filter(
      (item) => item.createdAt && new Date(item.createdAt).toDateString() === todayKey,
    ).length;
    const action = items.filter((item) =>
      ACTION_REQUIRED.test(`${item.title} ${item.body}`),
    ).length;

    return [
      {
        key: 'unread',
        label: 'Unread',
        value: unread,
        icon: <FiBell size={14} />,
        tone: unread > 0 ? 'accent' : 'success',
        hint: 'In the loaded page',
      },
      {
        key: 'today',
        label: 'Received today',
        value: today,
        icon: <FiClock size={14} />,
        tone: 'info',
        hint: 'In the loaded page',
      },
      {
        key: 'action',
        label: 'Needs your action',
        value: action,
        icon: <FiMessageCircle size={14} />,
        tone: action > 0 ? 'warning' : 'success',
        hint: 'In the loaded page',
      },
    ];
  }, [data]);

  const unreadOnPage = useMemo(
    () => (data?.items ?? []).filter((item) => !item.read).length,
    [data],
  );

  const handleMarkAll = async () => {
    await markAllRead();
    notify.success('All caught up', { message: 'Every loaded notification is marked as read.' });
  };

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing notifications');
  };

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-notif__error">
            <h1 className="nx-notif__error-title">Could not load notifications</h1>
            <p className="nx-notif__error-text">
              {serverMessage(error, 'The notification centre is unavailable right now.')}
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
          <span className="page__eyebrow">Inbox</span>
          <h1 className="page__title">Notifications</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading notifications…'
              : `${data?.total ?? rows.length} ${
                  (data?.total ?? rows.length) === 1 ? 'notification' : 'notifications'
                } — orders, payments, stock alerts and mentions from across the workspace`}
          </p>
        </div>

        <div className="page__actions">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FiCheck size={15} />}
            onClick={handleMarkAll}
            loading={isMarkingAll}
            disabled={unreadOnPage === 0}
          >
            Mark all read
          </Button>
        </div>
      </div>

      <div className="page__body nx-notif">
        <div className="grid grid--3">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={isLoading} />
          ))}
        </div>

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Search title or message"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by read state">
              {READ_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`nx-segmented__item${readFilter === filter.id ? ' is-active' : ''}`}
                  aria-pressed={readFilter === filter.id}
                  onClick={() => setReadFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </TableToolbar>

          <DataTable
            columns={columns}
            data={rows}
            loading={isLoading}
            skeleton
            page={table.page}
            pageSize={table.pageSize}
            total={data?.total ?? rows.length}
            totalPages={data?.totalPages}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            sortBy={table.sortBy}
            sortOrder={table.sortOrder}
            onSort={table.toggleSort}
            visibleColumns={table.visibleColumns}
            rowClassName={(item) => (item.read ? '' : 'nx-notif__row--unread')}
            itemLabel="notifications"
            emptyIcon={<FiBell size={24} />}
            emptyTitle={readFilter === 'all' ? "You're all caught up" : 'No notifications here'}
            emptyDescription={
              readFilter === 'all'
                ? 'New orders, payments and stock alerts will appear here as they happen.'
                : 'Switch the filter above to see the rest of your notifications.'
            }
            isFiltered={table.isFiltered || readFilter !== 'all'}
          />
        </Card>
      </div>
    </div>
  );
}
