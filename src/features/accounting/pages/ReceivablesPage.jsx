/**
 * ArkCRM — ReceivablesPage
 * ---------------------------------------------------------------------------
 * The AR ageing screen: the bucket strip comes first because "how much is late,
 * and how late" is the question this page exists to answer; the invoice table
 * underneath answers "who do I chase".
 *
 * `/accounting/receivables` returns the FULL unpaid-invoice array, not a page,
 * so search and sort run locally against `useDataTable`'s state and the table
 * slices in memory (`clientSide`). Handing `table.queryParams` to the query
 * would send the mock a page offset for a collection it never paginates, and
 * the counts would then disagree with the rows on screen.
 *
 * Buckets come from the server rather than being recomputed here, so this strip
 * and the dashboard's ageing widget can never drift apart.
 */

import { useMemo } from 'react';
import { FiAlertCircle, FiClock, FiDownload, FiFileText, FiRefreshCw } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetReceivablesQuery } from '../api/accountingApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { daysBetween, formatDate, isOverdue } from '@/utils/date';
import './ReceivablesPage.css';

import ExportMenu from '@/components/ui/ExportMenu/ExportMenu';
import { serverMessage } from '@/utils/errorMessage';
/** Placeholder cards for the ageing strip while the report loads. */
const BUCKET_SKELETONS = ['bucket-1', 'bucket-2', 'bucket-3', 'bucket-4', 'bucket-5'];

/** The columns the spreadsheet gets: plain values, not markup. */
const EXPORT_COLUMNS = [
  { key: 'number', label: 'Invoice' },
  { key: 'customer', label: 'Customer' },
  { key: 'issueDate', label: 'Issued', value: (row) => formatDate(row.issueDate) },
  { key: 'dueDate', label: 'Due', value: (row) => formatDate(row.dueDate) },
  { key: 'status', label: 'Status', value: (row) => row.status?.label ?? row.statusKey },
  { key: 'balance', label: 'Balance' },
  { key: 'paymentTerms', label: 'Terms' },
  { key: 'owner', label: 'Owner' },
];

export default function ReceivablesPage() {
  const notify = useNotify();
  const { currency } = useTenant();

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Invoice',
        sortable: true,
        render: (invoice) => (
          <div className="nx-recv__cell">
            <span className="nx-recv__mark" aria-hidden="true">
              <FiFileText size={14} />
            </span>
            <div className="nx-recv__ident">
              <strong className="nx-recv__number">{invoice.number}</strong>
              <span className="nx-recv__meta">{invoice.paymentTerms}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        sortable: true,
        render: (invoice) => <span className="nx-recv__customer">{invoice.customer}</span>,
      },
      {
        key: 'issueDate',
        header: 'Issued',
        align: 'right',
        sortable: true,
        render: (invoice) => <span className="nx-recv__date">{formatDate(invoice.issueDate)}</span>,
      },
      {
        key: 'dueDate',
        header: 'Due',
        align: 'right',
        sortable: true,
        render: (invoice) => {
          const late = invoice.balance > 0 && isOverdue(invoice.dueDate);
          return (
            <span className="nx-recv__date" data-late={late || undefined}>
              {formatDate(invoice.dueDate)}
              {/* The word alongside the date: colour alone is not a signal. */}
              {late ? <span className="nx-recv__late-flag">overdue</span> : null}
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
        key: 'balance',
        header: 'Balance',
        align: 'right',
        sortable: true,
        render: (invoice) => (
          <span className="nx-recv__num nx-recv__num--strong">
            {formatCurrency(invoice.balance, { currency })}
          </span>
        ),
      },
    ],
    [currency],
  );

  const table = useDataTable({
    tableName: 'receivables',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetReceivablesQuery();

  const items = useMemo(() => data?.items ?? [], [data]);

  /* The endpoint is unpaginated, so the search is a plain client-side filter
     over the fields the table actually shows. */
  const rows = useMemo(() => {
    const needle = table.debouncedSearch.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((invoice) =>
      [invoice.number, invoice.customer, invoice.paymentTerms, invoice.owner].some((field) =>
        String(field ?? '').toLowerCase().includes(needle),
      ),
    );
  }, [items, table.debouncedSearch]);

  const summary = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    let daysTotal = 0;
    let aged = 0;

    for (const invoice of items) {
      const balance = invoice.balance ?? 0;
      if (balance <= 0) continue;
      outstanding += balance;
      daysTotal += daysBetween(invoice.issueDate, Date.now());
      aged += 1;
      if (isOverdue(invoice.dueDate)) overdue += balance;
    }

    return {
      outstanding,
      overdue,
      avgDays: aged ? Math.round(daysTotal / aged) : 0,
    };
  }, [items]);

  const kpis = useMemo(
    () => [
      {
        key: 'outstanding',
        label: 'Total outstanding',
        value: formatCurrency(summary.outstanding, { currency, compact: true }),
        icon: <FiAlertCircle size={14} />,
        tone: summary.outstanding > 0 ? 'warning' : 'success',
        hint: 'All unpaid invoices',
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
        key: 'avg-days',
        label: 'Avg. days outstanding',
        value: `${summary.avgDays} days`,
        icon: <FiClock size={14} />,
        tone: 'accent',
        hint: 'Issue date to today',
      },
    ],
    [summary, currency],
  );

  const buckets = data?.buckets ?? [];
  const bucketTotal = data?.total ?? 0;

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing receivables');
  };

  if (isError) {
    return (
      <div className="page nx-recv">
        <Card padding="lg">
          <div className="nx-recv__error">
            <h1 className="nx-recv__error-title">Could not load receivables</h1>
            <p className="nx-recv__error-text">
              {serverMessage(error, 'The ageing report is unavailable right now.')}
            </p>
            <Button onClick={handleRefresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-recv">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Accounting</span>
          <h1 className="page__title">Receivables</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading receivables…'
              : `${items.length} unpaid ${items.length === 1 ? 'invoice' : 'invoices'} · ${formatCurrency(
                  summary.outstanding,
                  { currency, compact: true },
                )} outstanding`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh receivables"
          >
            Refresh
          </Button>
          <ExportMenu
            columns={EXPORT_COLUMNS}
            rows={rows}
            filename="receivables"
            title="Receivables"
          />
        </div>
      </div>

      <div className="page__body">
        <div className="grid grid--3">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={isLoading} />
          ))}
        </div>

        <section className="page__section" aria-labelledby="nx-recv-ageing-title">
          <h2 className="page__section-title" id="nx-recv-ageing-title">
            <span>Ageing buckets</span>
            <span className="nx-recv__section-note">Grouped by due date</span>
          </h2>

          <div className="nx-recv__buckets" role="group" aria-label="Outstanding balance by ageing bucket">
            {isLoading
              ? BUCKET_SKELETONS.map((id) => (
                  <Card key={id} className="nx-recv__bucket" padding="md" aria-hidden="true">
                    <span className="skeleton skeleton--text nx-recv__bucket-skel" />
                    <span className="skeleton skeleton--text nx-recv__bucket-skel nx-recv__bucket-skel--amount" />
                  </Card>
                ))
              : buckets.map((bucket) => {
                  const share = bucketTotal ? Math.round((bucket.amount / bucketTotal) * 100) : 0;
                  return (
                    <Card key={bucket.label} className="nx-recv__bucket" padding="md">
                      <Badge tone={bucket.tone ?? 'neutral'} dot className="nx-recv__bucket-badge">
                        {bucket.label}
                      </Badge>
                      <strong className="nx-recv__bucket-amount">
                        {formatCurrency(bucket.amount, { currency })}
                      </strong>
                      <span className="nx-recv__bucket-share">{share}% of outstanding</span>
                    </Card>
                  );
                })}
          </div>
        </section>

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
          />

          <DataTable
            columns={columns}
            data={rows}
            clientSide
            loading={isLoading}
            skeleton
            page={table.page}
            pageSize={table.pageSize}
            total={rows.length}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            sortBy={table.sortBy}
            sortOrder={table.sortOrder}
            onSort={table.toggleSort}
            visibleColumns={table.visibleColumns}
            isFiltered={table.hasActiveControls}
            itemLabel="invoices"
            emptyIcon={<FiFileText />}
            emptyTitle="Nothing outstanding"
            emptyDescription="Every invoice has been settled — there is nothing to chase."
          />
        </Card>
      </div>
    </div>
  );
}
