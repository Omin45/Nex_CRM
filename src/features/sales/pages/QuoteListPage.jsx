/**
 * NexERP — QuoteListPage
 * ---------------------------------------------------------------------------
 * The quote register: server-driven search, sort and pagination over
 * /sales/quotes, plus a summary of the quotes currently on screen.
 *
 * Every KPI is derived from `rows` and each hint says so ("On this page of
 * quotes"), because the endpoint pages and a bare number would otherwise be
 * read as a company-wide total. The fixture stores `status` as a bare key
 * ('SENT', 'ACCEPTED' …) rather than the { label, tone } object invoices
 * carry, so QUOTE_STATUS lives here. With no /sales/quotes/:id route in this
 * build, the row action opens a dialog instead of faking navigation.
 */

import { useMemo, useState } from 'react';
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiTrendingUp,
} from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Modal from '@/components/ui/Modal/Modal';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetQuotesQuery } from '../api/salesApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { formatDate, isOverdue } from '@/utils/date';
import './QuoteListPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SENT', label: 'Sent' },
  { id: 'VIEWED', label: 'Viewed' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'DECLINED', label: 'Declined' },
  { id: 'EXPIRED', label: 'Expired' },
];

const QUOTE_STATUS = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SENT: { label: 'Sent', tone: 'info' },
  VIEWED: { label: 'Viewed', tone: 'info' },
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  DECLINED: { label: 'Declined', tone: 'danger' },
  EXPIRED: { label: 'Expired', tone: 'warning' },
};

function statusMeta(key) {
  return QUOTE_STATUS[key] ?? { label: key ?? 'Unknown', tone: 'neutral' };
}

/**
 * A quote has lapsed when its window has passed and the customer never
 * signed. An accepted quote is immune: validity stops mattering the moment
 * it is agreed, and flagging it "expired" would be a lie.
 */
function isQuoteExpired(quote) {
  if (quote.status === 'ACCEPTED') return false;
  return quote.status === 'EXPIRED' || isOverdue(quote.validUntil);
}

export default function QuoteListPage() {
  const notify = useNotify();
  const { currency } = useTenant();

  /* Kept local rather than folded into `queryParams` — see the note on the
     product page. The mock's collection query treats every unknown param as
     an exact-match filter, and status composes better with the server-side
     search when the two are independent anyway. */
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Quote',
        sortable: true,
        render: (quote) => (
          <div className="nx-quote-list__cell">
            <span className="nx-quote-list__mark" aria-hidden="true">
              <FiFileText size={14} />
            </span>
            <div className="nx-quote-list__ident">
              <strong className="nx-quote-list__number">{quote.number}</strong>
              <span className="nx-quote-list__meta">{quote.owner}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        sortable: true,
        render: (quote) => <span className="nx-quote-list__customer">{quote.customer}</span>,
      },
      {
        key: 'validUntil',
        header: 'Valid until',
        align: 'right',
        sortable: true,
        render: (quote) => {
          const expired = isQuoteExpired(quote);
          return (
            <span className="nx-quote-list__date" data-expired={expired || undefined}>
              {formatDate(quote.validUntil)}
              {/* The word beside the date: a red date alone is a colour-only
                  signal, which fails anyone who cannot see it. */}
              {expired ? <span className="nx-quote-list__expired-flag">expired</span> : null}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (quote) => {
          const meta = statusMeta(quote.status);
          return (
            <Badge tone={meta.tone} dot>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        sortable: true,
        render: (quote) => (
          <span className="nx-quote-list__num nx-quote-list__num--strong">
            {formatCurrency(quote.total, { currency })}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Open',
        align: 'right',
        sortable: false,
        hideable: false,
        render: (quote) => (
          <button
            type="button"
            className="nx-quote-list__open"
            onClick={() => setSelected(quote)}
            aria-label={`Open quote ${quote.number}`}
          >
            <FiArrowRight size={15} aria-hidden="true" />
          </button>
        ),
      },
    ],
    [currency],
  );

  const table = useDataTable({
    tableName: 'quotes',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetQuotesQuery(table.queryParams);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (status === 'all') return items;
    return items.filter((quote) => quote.status === status);
  }, [data, status]);

  /* The summary reflects the *page* of quotes on screen, not the whole
     book. Saying so in every hint avoids a page-scoped number being read as
     a company-wide one. */
  const summary = useMemo(() => {
    const quoted = rows.reduce((sum, quote) => sum + (quote.total ?? 0), 0);
    const awaiting = rows.filter((quote) => quote.status === 'SENT' || quote.status === 'VIEWED').length;
    const accepted = rows.filter((quote) => quote.status === 'ACCEPTED');
    const declined = rows.filter((quote) => quote.status === 'DECLINED').length;
    const decided = accepted.length + declined;

    return {
      quoted,
      awaiting,
      acceptedValue: accepted.reduce((sum, quote) => sum + (quote.total ?? 0), 0),
      /* Won over decided: drafts, sent and expired quotes are not losses, so
         counting them would make the rate look worse than the book is. */
      winRate: decided > 0 ? Math.round((accepted.length / decided) * 100) : null,
    };
  }, [rows]);

  const kpis = useMemo(
    () => [
      {
        key: 'quoted',
        label: 'Total value quoted',
        value: formatCurrency(summary.quoted, { currency, compact: true }),
        icon: <FiFileText size={14} />,
        tone: 'accent',
        hint: 'On this page of quotes',
      },
      {
        key: 'awaiting',
        label: 'Awaiting response',
        value: summary.awaiting,
        icon: <FiClock size={14} />,
        tone: summary.awaiting > 0 ? 'warning' : 'success',
        hint: 'On this page of quotes',
      },
      {
        key: 'accepted',
        label: 'Accepted this period',
        value: formatCurrency(summary.acceptedValue, { currency, compact: true }),
        icon: <FiCheckCircle size={14} />,
        tone: 'success',
        hint: 'On this page of quotes',
      },
      {
        key: 'winRate',
        label: 'Win rate',
        value: summary.winRate === null ? '—' : `${summary.winRate}%`,
        icon: <FiTrendingUp size={14} />,
        tone: summary.winRate === null ? 'accent' : summary.winRate >= 50 ? 'success' : 'warning',
        hint: 'On this page of quotes',
      },
    ],
    [summary, currency],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing quotes');
  };

  const isFiltered = status !== 'all' || Boolean(table.debouncedSearch);

  const detailRows = useMemo(() => {
    if (!selected) return [];
    const meta = statusMeta(selected.status);
    const expired = isQuoteExpired(selected);
    return [
      { label: 'Status', value: <Badge tone={meta.tone} dot>{meta.label}</Badge> },
      { label: 'Customer', value: selected.customer },
      { label: 'Owner', value: selected.owner },
      { label: 'Issued', value: formatDate(selected.issueDate) },
      {
        label: 'Valid until',
        value: (
          <>
            {formatDate(selected.validUntil)}
            {expired ? <span className="nx-quote-list__expired-flag">expired</span> : null}
          </>
        ),
      },
      { label: 'Line items', value: selected.items ?? '—' },
      { label: 'Probability', value: `${selected.probability ?? 0}%` },
      { label: 'Total', value: formatCurrency(selected.total, { currency }) },
    ];
  }, [selected, currency]);

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-quote-list__error">
            <h1 className="nx-quote-list__error-title">Could not load quotes</h1>
            <p className="nx-quote-list__error-text">
              {error?.data?.message ?? 'The quote register is unavailable right now.'}
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
          <span className="page__eyebrow">Sales</span>
          <h1 className="page__title">Quotes</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading quotes…'
              : `${data?.total ?? rows.length} ${(data?.total ?? rows.length) === 1 ? 'quote' : 'quotes'} in the register`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh quotes"
          >
            Refresh
          </Button>
          <Button variant="outline" size="sm" leftIcon={<FiDownload size={15} />}>
            Export
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />}>
            New quote
          </Button>
        </div>
      </div>

      <div className="page__body">
        <div className="grid grid--metrics">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={isLoading} />
          ))}
        </div>

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Quote number, customer, owner"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-quote-list__filters">
              <div className="nx-segmented" role="group" aria-label="Filter by quote status">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`nx-segmented__item${status === filter.id ? ' is-active' : ''}`}
                    aria-pressed={status === filter.id}
                    onClick={() => setStatus(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
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
            itemLabel="quotes"
            emptyIcon={<FiFileText />}
            emptyTitle={isFiltered ? 'No quotes match' : 'No quotes yet'}
            emptyDescription={
              isFiltered
                ? 'Try a different status filter or clear the search.'
                : 'Raise your first quote and it will appear here.'
            }
          />
        </Card>
      </div>

      {/* There is no /sales/quotes/:id route in this build, so "open" is a
          dialog rather than a link — a real affordance beats a dead one. */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Quote ${selected.number}` : ''}
        subtitle={selected?.customer}
        size="sm"
        footer={
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        <dl className="nx-quote-list__detail">
          {detailRows.map((row) => (
            <div className="nx-quote-list__detail-row" key={row.label}>
              <dt className="nx-quote-list__detail-label">{row.label}</dt>
              <dd className="nx-quote-list__detail-value">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Modal>
    </div>
  );
}
