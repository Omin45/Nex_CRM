/**
 * ArkCRM — PayablesPage
 * ---------------------------------------------------------------------------
 * The AP mirror of ReceivablesPage: an ageing strip over the bills a business
 * still has to settle, then the bills themselves.
 *
 * `/accounting/payables` ages expenses against `expenseDate` — the fixtures
 * carry no `dueDate` — so this page reads that same date as the due date in
 * its table and KPIs rather than inventing terms the server does not apply.
 * "Due this week" is therefore a bill dated within seven days of today.
 *
 * "Mark paid" is wired to `useUpdateExpenseMutation` setting the expense's
 * real settled state (`REIMBURSED` — the expense vocabulary has no PAID key).
 * A settled bill drops out of the server's APPROVED-only list, so the row
 * leaving the table is the API agreeing, not a local trick.
 */

import { useCallback, useMemo, useState } from 'react';
import { FiAlertCircle, FiClock, FiDownload, FiFileText, FiRefreshCw } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetPayablesQuery, useUpdateExpenseMutation } from '../api/accountingApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { daysOverdue, formatDate, isOverdue } from '@/utils/date';
import './PayablesPage.css';

import ExportMenu from '@/components/ui/ExportMenu/ExportMenu';
import { serverMessage } from '@/utils/errorMessage';
/** Placeholder cards for the ageing strip while the report loads. */
const BUCKET_SKELETONS = ['bucket-1', 'bucket-2', 'bucket-3', 'bucket-4', 'bucket-5'];

/** The columns the spreadsheet gets: plain values, not markup. */
const EXPORT_COLUMNS = [
  { key: 'reference', label: 'Bill' },
  { key: 'description', label: 'Description' },
  { key: 'vendorName', label: 'Vendor' },
  { key: 'category', label: 'Category' },
  { key: 'expenseDate', label: 'Date', value: (row) => formatDate(row.expenseDate) },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status', value: (row) => row.status?.label ?? row.statusKey },
];

export default function PayablesPage() {
  const notify = useNotify();
  const { currency } = useTenant();
  const [updateExpense] = useUpdateExpenseMutation();
  /* Only one bill can be in flight at a time; the id drives that row's spinner
     so a slow save cannot be mistaken for every row being saved. */
  const [savingId, setSavingId] = useState(null);

  const handleMarkPaid = useCallback(
    async (bill) => {
      setSavingId(bill.id);
      try {
        await updateExpense({
          id: bill.id,
          statusKey: 'REIMBURSED',
          status: { label: 'Reimbursed', tone: 'info' },
        }).unwrap();
        
      } catch (err) {
        notify.error(serverMessage(err, `Could not update ${bill.reference}`));
      } finally {
        setSavingId(null);
      }
    },
    [updateExpense, notify],
  );

  const columns = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Bill',
        sortable: true,
        render: (bill) => (
          <div className="nx-pay__cell">
            <span className="nx-pay__mark" aria-hidden="true">
              <FiFileText size={14} />
            </span>
            <div className="nx-pay__ident">
              <strong className="nx-pay__number">{bill.reference}</strong>
              <span className="nx-pay__meta">{bill.description}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'vendorName',
        header: 'Vendor',
        sortable: true,
        render: (bill) => <span className="nx-pay__vendor">{bill.vendorName}</span>,
      },
      {
        key: 'category',
        header: 'Category',
        sortable: true,
        render: (bill) => <span className="nx-pay__category">{bill.category}</span>,
      },
      {
        key: 'expenseDate',
        header: 'Due',
        align: 'right',
        sortable: true,
        render: (bill) => {
          const late = isOverdue(bill.expenseDate);
          return (
            <span className="nx-pay__date" data-late={late || undefined}>
              {formatDate(bill.expenseDate)}
              {/* Words with the colour — never the colour alone. */}
              {late ? <span className="nx-pay__late-flag">overdue</span> : null}
            </span>
          );
        },
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        sortable: true,
        render: (bill) => (
          <span className="nx-pay__num nx-pay__num--strong">
            {formatCurrency(bill.amount, { currency })}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        render: (bill) => (
          <Button
            size="xs"
            variant="outline"
            loading={savingId === bill.id}
            onClick={() => handleMarkPaid(bill)}
            aria-label={`Mark ${bill.reference} as paid`}
          >
            Mark paid
          </Button>
        ),
      },
    ],
    [currency, handleMarkPaid, savingId],
  );

  const table = useDataTable({
    tableName: 'payables',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetPayablesQuery();

  const items = useMemo(() => data?.items ?? [], [data]);

  const rows = useMemo(() => {
    const needle = table.debouncedSearch.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((bill) =>
      [bill.reference, bill.description, bill.vendorName, bill.category].some((field) =>
        String(field ?? '').toLowerCase().includes(needle),
      ),
    );
  }, [items, table.debouncedSearch]);

  const summary = useMemo(() => {
    let total = 0;
    let thisWeek = 0;
    let overdue = 0;

    for (const bill of items) {
      const amount = bill.amount ?? 0;
      const days = daysOverdue(bill.expenseDate);
      total += amount;
      /* ±7 days of today: the bill lands in the current payment week, in
         whichever direction the date sits. */
      if (days >= -7 && days <= 7) thisWeek += amount;
      if (days > 0) overdue += amount;
    }

    return { total, thisWeek, overdue };
  }, [items]);

  const kpis = useMemo(
    () => [
      {
        key: 'total',
        label: 'Total due',
        value: formatCurrency(summary.total, { currency, compact: true }),
        icon: <FiAlertCircle size={14} />,
        tone: summary.total > 0 ? 'warning' : 'success',
        hint: 'Approved, unsettled bills',
      },
      {
        key: 'week',
        label: 'Due this week',
        value: formatCurrency(summary.thisWeek, { currency, compact: true }),
        icon: <FiClock size={14} />,
        tone: summary.thisWeek > 0 ? 'accent' : 'success',
        hint: 'Dated within 7 days of today',
      },
      {
        key: 'overdue',
        label: 'Overdue',
        value: formatCurrency(summary.overdue, { currency, compact: true }),
        icon: <FiAlertCircle size={14} />,
        tone: summary.overdue > 0 ? 'danger' : 'success',
        hint: summary.overdue > 0 ? 'Past the expense date' : 'Nothing past due',
      },
    ],
    [summary, currency],
  );

  const buckets = data?.buckets ?? [];
  const bucketTotal = data?.total ?? 0;

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing payables');
  };

  if (isError) {
    return (
      <div className="page nx-pay">
        <Card padding="lg">
          <div className="nx-pay__error">
            <h1 className="nx-pay__error-title">Could not load payables</h1>
            <p className="nx-pay__error-text">
              {serverMessage(error, 'The payables ageing report is unavailable right now.')}
            </p>
            <Button onClick={handleRefresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-pay">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Accounting</span>
          <h1 className="page__title">Payables</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading payables…'
              : `${items.length} approved ${items.length === 1 ? 'bill' : 'bills'} · ${formatCurrency(
                  summary.total,
                  { currency, compact: true },
                )} to settle`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh payables"
          >
            Refresh
          </Button>
          <ExportMenu
            columns={EXPORT_COLUMNS}
            rows={rows}
            filename="payables"
            title="Payables"
          />
        </div>
      </div>

      <div className="page__body">
        <div className="grid grid--3">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={isLoading} />
          ))}
        </div>

        <section className="page__section" aria-labelledby="nx-pay-ageing-title">
          <h2 className="page__section-title" id="nx-pay-ageing-title">
            <span>Ageing buckets</span>
            <span className="nx-pay__section-note">Grouped by expense date</span>
          </h2>

          <div className="nx-pay__buckets" role="group" aria-label="Unsettled bills by ageing bucket">
            {isLoading
              ? BUCKET_SKELETONS.map((id) => (
                  <Card key={id} className="nx-pay__bucket" padding="md" aria-hidden="true">
                    <span className="skeleton skeleton--text nx-pay__bucket-skel" />
                    <span className="skeleton skeleton--text nx-pay__bucket-skel nx-pay__bucket-skel--amount" />
                  </Card>
                ))
              : buckets.map((bucket) => {
                  const share = bucketTotal ? Math.round((bucket.amount / bucketTotal) * 100) : 0;
                  return (
                    <Card key={bucket.label} className="nx-pay__bucket" padding="md">
                      <Badge tone={bucket.tone ?? 'neutral'} dot className="nx-pay__bucket-badge">
                        {bucket.label}
                      </Badge>
                      <strong className="nx-pay__bucket-amount">
                        {formatCurrency(bucket.amount, { currency })}
                      </strong>
                      <span className="nx-pay__bucket-share">{share}% of total due</span>
                    </Card>
                  );
                })}
          </div>
        </section>

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Reference, vendor, category"
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
            itemLabel="bills"
            emptyIcon={<FiFileText />}
            emptyTitle="No bills due"
            emptyDescription="Approved expenses will appear here until they are settled."
          />
        </Card>
      </div>
    </div>
  );
}
