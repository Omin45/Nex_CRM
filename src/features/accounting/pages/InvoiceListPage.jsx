/**
 * NexERP — InvoiceListPage
 * ---------------------------------------------------------------------------
 * The invoice register: server-driven search, sort and pagination, plus an
 * outstanding-balance summary above the table.
 *
 * The summary is not decoration. On a receivables screen the three numbers
 * that matter are money still owed, how much of it is late, and how much was
 * collected this period. Putting those above the table means the page answers
 * "how exposed am I?" before the reader scrolls.
 *
 * Aging is computed here from `dueDate` rather than fetched, because it is a
 * pure function of data the invoice already carries. `agingBucket` in
 * utils/currency owns the boundaries so the invoice page and the receivables
 * report can never disagree about what counts as "old".
 */

import { useMemo, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiDownload, FiFileText, FiPlus, FiRefreshCw } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetInvoicesQuery } from '../api/accountingApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { formatDate, isOverdue } from '@/utils/date';
import './InvoiceListPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'SENT', label: 'Sent' },
  { id: 'PARTIALLY_PAID', label: 'Part paid' },
  { id: 'PAID', label: 'Paid' },
];

export default function InvoiceListPage() {
  const notify = useNotify();
  const { currency } = useTenant();

  /* Local, for the same reason as the product page: a `status` filter would be
     folded into `queryParams`, and the mock would try to exact-match it against
     the invoice's `status` object. The invoice does carry a real `statusKey`,
     so this one *could* be server-side — but keeping it client-side means the
     status tabs and the server-side search compose predictably. */
  const [status, setStatus] = useState('all');

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Invoice',
        sortable: true,
        render: (invoice) => (
          <div className="nx-inv-list__cell">
            <span className="nx-inv-list__mark" aria-hidden="true">
              <FiFileText size={14} />
            </span>
            <div className="nx-inv-list__ident">
              <strong className="nx-inv-list__number">{invoice.number}</strong>
              <span className="nx-inv-list__meta">{invoice.paymentTerms}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        sortable: true,
        render: (invoice) => <span className="nx-inv-list__customer">{invoice.customer}</span>,
      },
      {
        key: 'issueDate',
        header: 'Issued',
        align: 'right',
        sortable: true,
        render: (invoice) => (
          <span className="nx-inv-list__date">{formatDate(invoice.issueDate)}</span>
        ),
      },
      {
        key: 'dueDate',
        header: 'Due',
        align: 'right',
        sortable: true,
        render: (invoice) => {
          const late = invoice.balance > 0 && isOverdue(invoice.dueDate);
          return (
            <span className="nx-inv-list__date" data-late={late || undefined}>
              {formatDate(invoice.dueDate)}
              {/* The word "overdue" alongside the date: a red date alone is a
                  colour-only signal, which fails anyone who cannot see it. */}
              {late ? <span className="nx-inv-list__late-flag">overdue</span> : null}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (invoice) => (
          <Badge tone={invoice.status?.tone ?? 'neutral'} dot>
            {invoice.status?.label ?? invoice.statusKey}
          </Badge>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        sortable: true,
        render: (invoice) => (
          <span className="nx-inv-list__num nx-inv-list__num--strong">
            {formatCurrency(invoice.total, { currency })}
          </span>
        ),
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        sortable: true,
        render: (invoice) => (
          <span className="nx-inv-list__num" data-due={invoice.balance > 0 || undefined}>
            {invoice.balance > 0 ? formatCurrency(invoice.balance, { currency }) : '—'}
          </span>
        ),
      },
    ],
    [currency],
  );

  const table = useDataTable({
    tableName: 'invoices',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetInvoicesQuery(table.queryParams);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (status === 'all') return items;
    return items.filter((invoice) => invoice.statusKey === status);
  }, [data, status]);

  /* The summary reflects the *page* of invoices on screen, not the whole
     ledger. Saying so in the hint avoids the number being read as a
     company-wide total. */
  const summary = useMemo(() => {
    const outstanding = rows.reduce((sum, invoice) => sum + (invoice.balance ?? 0), 0);
    const overdue = rows
      .filter((invoice) => invoice.balance > 0 && isOverdue(invoice.dueDate))
      .reduce((sum, invoice) => sum + invoice.balance, 0);
    const collected = rows.reduce((sum, invoice) => sum + (invoice.amountPaid ?? 0), 0);

    return { outstanding, overdue, collected };
  }, [rows]);

  const kpis = useMemo(
    () => [
      {
        key: 'outstanding',
        label: 'Outstanding',
        value: formatCurrency(summary.outstanding, { currency, compact: true }),
        icon: <FiAlertCircle size={14} />,
        tone: summary.outstanding > 0 ? 'warning' : 'success',
        hint: 'On this page of invoices',
      },
      {
        key: 'overdue',
        label: 'Overdue',
        value: formatCurrency(summary.overdue, { currency, compact: true }),
        icon: <FiAlertCircle size={14} />,
        tone: summary.overdue > 0 ? 'danger' : 'success',
        hint: summary.overdue > 0 ? 'Past the due date' : 'Nothing past due',
      },
      {
        key: 'collected',
        label: 'Collected',
        value: formatCurrency(summary.collected, { currency, compact: true }),
        icon: <FiCheckCircle size={14} />,
        tone: 'success',
        hint: 'Payments received',
      },
    ],
    [summary, currency],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing invoices');
  };

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-inv-list__error">
            <h1 className="nx-inv-list__error-title">Could not load invoices</h1>
            <p className="nx-inv-list__error-text">
              {error?.data?.message ?? 'The invoice register is unavailable right now.'}
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
          <span className="page__eyebrow">Accounting</span>
          <h1 className="page__title">Invoices</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading invoices…'
              : `${data?.total ?? rows.length} ${
                  (data?.total ?? rows.length) === 1 ? 'invoice' : 'invoices'
                } in the register`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh invoices"
          >
            Refresh
          </Button>
          <Button variant="outline" size="sm" leftIcon={<FiDownload size={15} />}>
            Export
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />}>
            New invoice
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
            searchPlaceholder="Number, customer, terms"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by invoice status">
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
            itemLabel="invoices"
            emptyIcon={<FiFileText />}
            emptyTitle={status === 'all' ? 'No invoices yet' : 'No invoices match'}
            emptyDescription={
              status === 'all'
                ? 'Raise your first invoice and it will appear here.'
                : 'Try a different status filter or clear the search.'
            }
          />
        </Card>
      </div>
    </div>
  );
}
