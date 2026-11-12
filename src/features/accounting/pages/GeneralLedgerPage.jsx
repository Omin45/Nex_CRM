/**
 * ArkCRM — GeneralLedgerPage
 * ---------------------------------------------------------------------------
 * The journal: server-driven search, sort and pagination over `/accounting/ledger`,
 * with a trial balance pinned above it so the reader can confirm the books
 * balance before trusting any single page of entries.
 *
 * The running balance is computed in a useMemo keyed on the response object.
 * A page/search change always produces a fresh response, so the total
 * restarts with the rows currently loaded — which is the honest scope for it:
 * a running balance stitched across an arbitrary server page would imply a
 * ledger-wide figure the API never sent. Treat it as "where this page lands",
 * not as the account balance.
 *
 * Debits and credits are shown as a dash when zero rather than ₦0.00: a wall
 * of zeroes hides the two numbers that matter.
 */

import { useMemo } from 'react';
import { FiBook, FiDownload, FiRefreshCw } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import { useGetLedgerQuery, useGetTrialBalanceQuery } from '../api/accountingApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import './GeneralLedgerPage.css';

import ExportMenu from '@/components/ui/ExportMenu/ExportMenu';
import { serverMessage } from '@/utils/errorMessage';
/** The columns the spreadsheet gets: plain values, not markup. */
const EXPORT_COLUMNS = [
  { key: 'date', label: 'Date', value: (row) => formatDate(row.date) },
  { key: 'account', label: 'Account' },
  { key: 'reference', label: 'Reference' },
  { key: 'description', label: 'Description' },
  { key: 'debit', label: 'Debit' },
  { key: 'credit', label: 'Credit' },
  { key: 'currency', label: 'Currency' },
];

export default function GeneralLedgerPage() {
  const notify = useNotify();
  const { currency } = useTenant();

  const columns = useMemo(
    () => [
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        render: (entry) => <span className="nx-gl__date">{formatDate(entry.date)}</span>,
      },
      {
        key: 'reference',
        header: 'Reference',
        sortable: true,
        render: (entry) => <strong className="nx-gl__ref">{entry.reference}</strong>,
      },
      {
        key: 'account',
        header: 'Account',
        sortable: true,
        render: (entry) => <span className="nx-gl__account">{entry.account}</span>,
      },
      {
        key: 'description',
        header: 'Description',
        sortable: true,
        render: (entry) => <span className="nx-gl__desc">{entry.description}</span>,
      },
      {
        key: 'debit',
        header: 'Debit',
        align: 'right',
        sortable: true,
        render: (entry) => (
          <span className="nx-gl__num" data-amount={entry.debit > 0 || undefined}>
            {entry.debit > 0 ? formatCurrency(entry.debit, { currency }) : '—'}
          </span>
        ),
      },
      {
        key: 'credit',
        header: 'Credit',
        align: 'right',
        sortable: true,
        render: (entry) => (
          <span className="nx-gl__num" data-amount={entry.credit > 0 || undefined}>
            {entry.credit > 0 ? formatCurrency(entry.credit, { currency }) : '—'}
          </span>
        ),
      },
      {
        key: 'runningBalance',
        header: 'Balance',
        align: 'right',
        render: (entry) => (
          <span className="nx-gl__num nx-gl__num--strong">
            {formatCurrency(entry.runningBalance, { currency })}
          </span>
        ),
      },
    ],
    [currency],
  );

  const table = useDataTable({
    tableName: 'ledger',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetLedgerQuery(table.queryParams);
  const {
    data: trial,
    isLoading: trialLoading,
    isError: trialError,
    refetch: refetchTrial,
  } = useGetTrialBalanceQuery();

  /* Debits less credits, carried down the loaded page. See the file header:
     the scope is this response, and it restarts whenever the response does. */
  const rows = useMemo(() => {
    let running = 0;
    return (data?.items ?? []).map((entry) => {
      running += (entry.debit ?? 0) - (entry.credit ?? 0);
      return { ...entry, runningBalance: running };
    });
  }, [data]);

  const handleRefresh = () => {
    refetch();
    refetchTrial();
    notify.info('Refreshing the general ledger');
  };

  if (isError) {
    return (
      <div className="page nx-gl">
        <Card padding="lg">
          <div className="nx-gl__error">
            <h1 className="nx-gl__error-title">Could not load the ledger</h1>
            <p className="nx-gl__error-text">
              {serverMessage(error, 'The journal is unavailable right now.')}
            </p>
            <Button onClick={handleRefresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  const difference = Math.abs((trial?.debits ?? 0) - (trial?.credits ?? 0));

  return (
    <div className="page nx-gl">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Accounting</span>
          <h1 className="page__title">General ledger</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading journal entries…'
              : `${data?.total ?? 0} journal ${data?.total === 1 ? 'entry' : 'entries'} matching the current view`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh general ledger"
          >
            Refresh
          </Button>
          <ExportMenu
            columns={EXPORT_COLUMNS}
            rows={rows}
            filename="general-ledger"
            title="General ledger"
          />
        </div>
      </div>

      <div className="page__body">
        <Card className="nx-gl__trial" padding="md">
          <Card.Header
            title="Trial balance"
            subtitle="Debits, credits and whether the books balance right now"
          />

          {trialError ? (
            <div className="nx-gl__trial-fallback">
              <p className="nx-gl__trial-fallback-text">Trial balance is unavailable right now.</p>
              <Button size="xs" variant="outline" onClick={refetchTrial}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="nx-gl__trial-grid">
              <div className="nx-gl__trial-cell">
                <span className="nx-gl__trial-label">Total debits</span>
                {trialLoading || !trial ? (
                  <span className="skeleton skeleton--text nx-gl__trial-skel" />
                ) : (
                  <strong className="nx-gl__trial-value">{formatCurrency(trial.debits, { currency })}</strong>
                )}
              </div>

              <div className="nx-gl__trial-cell">
                <span className="nx-gl__trial-label">Total credits</span>
                {trialLoading || !trial ? (
                  <span className="skeleton skeleton--text nx-gl__trial-skel" />
                ) : (
                  <strong className="nx-gl__trial-value">{formatCurrency(trial.credits, { currency })}</strong>
                )}
              </div>

              <div className="nx-gl__trial-cell">
                <span className="nx-gl__trial-label">Difference</span>
                {trialLoading || !trial ? (
                  <span className="skeleton skeleton--text nx-gl__trial-skel" />
                ) : (
                  <strong className="nx-gl__trial-value" data-out-of-balance={!trial.balanced || undefined}>
                    {formatCurrency(difference, { currency })}
                  </strong>
                )}
              </div>

              <div className="nx-gl__trial-cell">
                <span className="nx-gl__trial-label">Status</span>
                {trialLoading || !trial ? (
                  <span className="skeleton skeleton--text nx-gl__trial-skel" />
                ) : (
                  <>
                    {/* The words are the signal; the tone only reinforces them. */}
                    <Badge tone={trial.balanced ? 'success' : 'danger'} dot>
                      {trial.balanced ? 'Balanced' : 'Out of balance'}
                    </Badge>
                    <span className="nx-gl__trial-note">
                      {trial.balanced ? 'Debits equal credits' : 'Debits and credits do not match'}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Reference, account, description"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          />

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
            isFiltered={table.hasActiveControls}
            itemLabel="entries"
            emptyIcon={<FiBook />}
            emptyTitle="No journal entries"
            emptyDescription="Postings appear here as invoices, bills and payments are recorded."
          />
        </Card>
      </div>
    </div>
  );
}
