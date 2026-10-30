/**
 * NexERP — StockMovementPage
 * ---------------------------------------------------------------------------
 * The stock movement log: every receipt, issue, transfer, adjustment and
 * return, newest first, with server-side search, paging and type filtering.
 *
 * The type filter is a segmented control passed as toolbar children (rather
 * than a `filters` entry) because six types will not fit the toolbar's four
 * pill slots — the same shape OrderListPage uses for its status filter. It is
 * still a *server-side* filter: `setFilter('type', …)` lands in `queryParams`,
 * and unlike the product status field the mock's movement rows carry a flat
 * `type` string, so exact-match filtering returns the right rows.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiFileText, FiMinus, FiPlus, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import MetricCard from '@/features/dashboard/components/MetricCard';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import { useGetMovementsQuery } from '../api/inventoryApi';
import { useNotify } from '@/hooks/useNotification';
import useVendorPath from '@/hooks/useVendorPath';
import useDataTable from '@/hooks/useDataTable';
import { formatDate, fromNow } from '@/utils/date';
import './StockMovementPage.css';

/** Movement type -> badge label and tone. Issues are the ones worth noticing. */
const TYPE_META = {
  RECEIPT: { label: 'Receipt', tone: 'success' },
  ISSUE: { label: 'Issue', tone: 'warning' },
  TRANSFER: { label: 'Transfer', tone: 'neutral' },
  ADJUSTMENT: { label: 'Adjustment', tone: 'info' },
  RETURN: { label: 'Return', tone: 'violet' },
};

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'RECEIPT', label: 'Receipt' },
  { id: 'ISSUE', label: 'Issue' },
  { id: 'TRANSFER', label: 'Transfer' },
  { id: 'ADJUSTMENT', label: 'Adjustment' },
  { id: 'RETURN', label: 'Return' },
];

export default function StockMovementPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const vendorPath = useVendorPath();

  const columns = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Reference',
        sortable: true,
        render: (row) => (
          <div className="nx-moves__cell">
            <strong className="nx-moves__ref">{row.reference}</strong>
            <span className="nx-moves__meta">{row.reason}</span>
          </div>
        ),
      },
      {
        key: 'productName',
        header: 'Product',
        render: (row) => (
          <div className="nx-moves__cell">
            <span className="nx-moves__product">{row.productName}</span>
            <span className="nx-moves__meta">{row.sku}</span>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (row) => (
          <Badge tone={TYPE_META[row.type]?.tone ?? 'neutral'}>
            {TYPE_META[row.type]?.label ?? row.type}
          </Badge>
        ),
      },
      {
        key: 'quantity',
        header: 'Qty',
        align: 'right',
        sortable: true,
        render: (row) => (
          /* Sign is written out as +/−, not implied by colour: a reader must be
             able to tell stock in from stock out without seeing hue. */
          <span className="nx-moves__qty" data-sign={row.quantity < 0 ? 'minus' : 'plus'}>
            {row.quantity > 0 ? '+' : ''}
            {row.quantity}
          </span>
        ),
      },
      {
        key: 'route',
        header: 'Route',
        render: (row) => (
          <span className="nx-moves__route">
            <span className="nx-moves__wh">{row.fromWarehouse ?? '—'}</span>
            <FiArrowRight size={12} className="nx-moves__arrow" aria-hidden="true" />
            <span className="nx-moves__wh">{row.toWarehouse ?? '—'}</span>
          </span>
        ),
      },
      {
        key: 'performedBy',
        header: 'By',
        render: (row) => <span className="nx-moves__meta">{row.performedBy}</span>,
      },
      {
        key: 'createdAt',
        header: 'When',
        sortable: true,
        render: (row) => (
          <span className="nx-moves__when">
            <span className="nx-moves__date">{formatDate(row.createdAt, 'medium')}</span>
            <span className="nx-moves__meta">{fromNow(row.createdAt)}</span>
          </span>
        ),
      },
    ],
    [],
  );

  const table = useDataTable({
    tableName: 'movements',
    columns,
    initialPageSize: 15,
    /* `type` is only sent when a type is chosen; `''` means "all types" and is
       stripped from the query params by useDataTable itself. */
    initialFilters: { type: '' },
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetMovementsQuery(
    table.queryParams,
  );

  const rows = useMemo(() => data?.items ?? [], [data]);

  /* The four figures are honest about their scope: three are totals of the
     page on screen, one is the filtered record count from the server. */
  const stats = useMemo(() => {
    let stockIn = 0;
    let stockOut = 0;
    rows.forEach((row) => {
      if (row.quantity > 0) stockIn += row.quantity;
      else stockOut += Math.abs(row.quantity);
    });
    return { stockIn, stockOut, net: stockIn - stockOut, total: data?.total ?? rows.length };
  }, [data, rows]);

  const kpis = useMemo(
    () => [
      {
        key: 'in',
        label: 'Stock in',
        value: stats.stockIn,
        icon: <FiPlus size={14} />,
        tone: 'success',
        hint: 'On this page',
      },
      {
        key: 'out',
        label: 'Stock out',
        value: stats.stockOut,
        icon: <FiMinus size={14} />,
        tone: 'warning',
        hint: 'On this page',
      },
      {
        key: 'net',
        label: 'Net movement',
        value: stats.net,
        icon: <FiTrendingUp size={14} />,
        tone: 'accent',
        hint: 'On this page',
      },
      {
        key: 'total',
        label: 'Movements',
        value: stats.total,
        icon: <FiFileText size={14} />,
        tone: 'info',
        hint: 'Matching the current filter',
      },
    ],
    [stats],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing stock movements');
  };

  if (isError) {
    return (
      <div className="page nx-moves">
        <Card padding="lg">
          <div className="nx-moves__error">
            <h1 className="nx-moves__error-title">Could not load movements</h1>
            <p className="nx-moves__error-text">
              {error?.data?.message ?? 'The movement log is unavailable right now.'}
            </p>
            <Button onClick={refetch}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-moves">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Inventory</span>
          <h1 className="page__title">Stock movements</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading the movement log…'
              : `${stats.total} ${stats.total === 1 ? 'movement' : 'movements'} on record · latest ${fromNow(rows[0]?.createdAt)}`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh stock movements"
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(vendorPath('inventory/adjustments'))}
          >
            Record adjustment
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(vendorPath('inventory/transfers'))}
          >
            New transfer
          </Button>
        </div>
      </div>

      <div className="page__body">
        <div className="grid grid--4">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={isLoading} />
          ))}
        </div>

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Reference, product, SKU, reason"
            onClearFilters={table.clearFilters}
            activeFilterCount={table.activeFilterCount}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-moves__filters">
              <div className="nx-segmented" role="group" aria-label="Filter by movement type">
                {TYPE_FILTERS.map((filter) => {
                  const isActive =
                    String(table.filters.type ?? '') === (filter.id === 'all' ? '' : filter.id);
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      className={`nx-segmented__item${isActive ? ' is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => table.setFilter('type', filter.id === 'all' ? '' : filter.id)}
                    >
                      {filter.label}
                    </button>
                  );
                })}
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
            itemLabel="movements"
            caption="Stock movement log"
            emptyIcon={<FiFileText />}
            emptyTitle={table.isFiltered ? 'No movements match' : 'No movements yet'}
            emptyDescription={
              table.isFiltered
                ? 'Try a different type filter or clear the search.'
                : 'Receipts, issues and transfers will appear here as stock moves.'
            }
            isFiltered={table.isFiltered}
          />
        </Card>
      </div>
    </div>
  );
}
