/**
 * NexERP — OrderListPage
 * ---------------------------------------------------------------------------
 * The sales-order register: server-driven search, sort and pagination over
 * /sales/orders, plus a summary of the orders currently on screen.
 *
 * Every KPI is derived from `rows` and each hint says so ("On this page of
 * orders"), because the endpoint pages and a bare number would otherwise be
 * read as a company-wide total. The fixture stores `status` as a bare key
 * ('CONFIRMED', 'SHIPPED' …) rather than the { label, tone } object invoices
 * carry, so ORDER_STATUS lives here. With no /sales/orders/:id route in this
 * build, the row action opens a dialog instead of faking navigation.
 */

import { useMemo, useState } from 'react';
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiPackage,
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
import { useGetOrdersQuery } from '../api/salesApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { formatDate, isOverdue } from '@/utils/date';
import './OrderListPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const ORDER_STATUS = {
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  PROCESSING: { label: 'Processing', tone: 'warning' },
  SHIPPED: { label: 'Shipped', tone: 'accent' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

/* Awaiting fulfilment = accepted but not yet on a van. Shipped counts as
   done for this tile: the warehouse's part is finished once it leaves. */
const AWAITING_STATUSES = ['CONFIRMED', 'PROCESSING'];
const COMPLETE_STATUSES = ['SHIPPED', 'DELIVERED'];

function statusMeta(key) {
  return ORDER_STATUS[key] ?? { label: key ?? 'Unknown', tone: 'neutral' };
}

/** Past the promised date while still owed to the customer. */
function isLate(order) {
  if (COMPLETE_STATUSES.includes(order.status) || order.status === 'CANCELLED') return false;
  return isOverdue(order.deliveryDate);
}

export default function OrderListPage() {
  const notify = useNotify();
  const { currency } = useTenant();

  /* Kept local rather than folded into `queryParams` — the same reasoning as
     the invoice and quote pages: the mock's collection query exact-matches
     every unknown param, and a status that composes with the server-side
     search is more useful than one that races it. */
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Order',
        sortable: true,
        render: (order) => (
          <div className="nx-order-list__cell">
            <span className="nx-order-list__mark" aria-hidden="true">
              <FiPackage size={14} />
            </span>
            <div className="nx-order-list__ident">
              <strong className="nx-order-list__number">{order.number}</strong>
              <span className="nx-order-list__meta">{order.owner}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        sortable: true,
        render: (order) => <span className="nx-order-list__customer">{order.customer}</span>,
      },
      {
        key: 'warehouse',
        header: 'Warehouse',
        sortable: true,
        render: (order) => <span className="nx-order-list__meta">{order.warehouse}</span>,
      },
      {
        key: 'orderDate',
        header: 'Ordered',
        align: 'right',
        sortable: true,
        render: (order) => (
          <span className="nx-order-list__date">{formatDate(order.orderDate)}</span>
        ),
      },
      {
        key: 'deliveryDate',
        header: 'Required by',
        align: 'right',
        sortable: true,
        render: (order) => {
          const late = isLate(order);
          return (
            <span className="nx-order-list__date" data-late={late || undefined}>
              {formatDate(order.deliveryDate)}
              {/* The word beside the date: a red date alone is a colour-only
                  signal, which fails anyone who cannot see it. */}
              {late ? <span className="nx-order-list__late-flag">late</span> : null}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (order) => {
          const meta = statusMeta(order.status);
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
        render: (order) => (
          <span className="nx-order-list__num nx-order-list__num--strong">
            {formatCurrency(order.total, { currency })}
          </span>
        ),
      },
      {
        key: 'items',
        header: 'Items',
        align: 'right',
        sortable: true,
        render: (order) => <span className="nx-order-list__num">{order.items}</span>,
      },
      {
        key: 'actions',
        header: 'Open',
        align: 'right',
        sortable: false,
        hideable: false,
        render: (order) => (
          <button
            type="button"
            className="nx-order-list__open"
            onClick={() => setSelected(order)}
            aria-label={`Open order ${order.number}`}
          >
            <FiArrowRight size={15} aria-hidden="true" />
          </button>
        ),
      },
    ],
    [currency],
  );

  const table = useDataTable({
    tableName: 'orders',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetOrdersQuery(table.queryParams);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (status === 'all') return items;
    return items.filter((order) => order.status === status);
  }, [data, status]);

  /* The summary reflects the *page* of orders on screen, not the whole book.
     Saying so in every hint avoids a page-scoped number being read as a
     company-wide one. */
  const summary = useMemo(() => {
    const awaiting = rows.filter((order) => AWAITING_STATUSES.includes(order.status)).length;
    const complete = rows.filter((order) => COMPLETE_STATUSES.includes(order.status)).length;

    return {
      count: rows.length,
      value: rows.reduce((sum, order) => sum + (order.total ?? 0), 0),
      awaiting,
      complete,
    };
  }, [rows]);

  const kpis = useMemo(
    () => [
      {
        key: 'count',
        label: 'Orders on screen',
        value: summary.count,
        icon: <FiPackage size={14} />,
        tone: 'accent',
        hint: 'On this page of orders',
      },
      {
        key: 'value',
        label: 'Order value',
        value: formatCurrency(summary.value, { currency, compact: true }),
        icon: <FiTrendingUp size={14} />,
        tone: 'success',
        hint: 'On this page of orders',
      },
      {
        key: 'awaiting',
        label: 'Awaiting fulfilment',
        value: summary.awaiting,
        icon: <FiClock size={14} />,
        tone: summary.awaiting > 0 ? 'warning' : 'success',
        hint: 'On this page of orders',
      },
      {
        key: 'complete',
        label: 'Shipped / complete',
        value: summary.complete,
        icon: <FiCheckCircle size={14} />,
        tone: 'success',
        hint: 'On this page of orders',
      },
    ],
    [summary, currency],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing orders');
  };

  const isFiltered = status !== 'all' || Boolean(table.debouncedSearch);

  const detailRows = useMemo(() => {
    if (!selected) return [];
    const meta = statusMeta(selected.status);
    const late = isLate(selected);
    return [
      { label: 'Status', value: <Badge tone={meta.tone} dot>{meta.label}</Badge> },
      { label: 'Customer', value: selected.customer },
      { label: 'Owner', value: selected.owner },
      { label: 'Warehouse', value: selected.warehouse },
      { label: 'Ordered', value: formatDate(selected.orderDate) },
      {
        label: 'Required by',
        value: (
          <>
            {formatDate(selected.deliveryDate)}
            {late ? <span className="nx-order-list__late-flag">late</span> : null}
          </>
        ),
      },
      { label: 'Line items', value: selected.items ?? '—' },
      { label: 'Fulfilment', value: `${selected.fulfilment ?? 0}%` },
      { label: 'Total', value: formatCurrency(selected.total, { currency }) },
    ];
  }, [selected, currency]);

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-order-list__error">
            <h1 className="nx-order-list__error-title">Could not load orders</h1>
            <p className="nx-order-list__error-text">
              {error?.data?.message ?? 'The sales-order register is unavailable right now.'}
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
          <h1 className="page__title">Orders</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading orders…'
              : `${data?.total ?? rows.length} ${(data?.total ?? rows.length) === 1 ? 'order' : 'orders'} in the register`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh orders"
          >
            Refresh
          </Button>
          <Button variant="outline" size="sm" leftIcon={<FiDownload size={15} />}>
            Export
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />}>
            New order
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
            searchPlaceholder="Order number, customer, warehouse"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-order-list__filters">
              <div className="nx-segmented" role="group" aria-label="Filter by order status">
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
            itemLabel="orders"
            emptyIcon={<FiPackage />}
            emptyTitle={isFiltered ? 'No orders match' : 'No orders yet'}
            emptyDescription={
              isFiltered
                ? 'Try a different status filter or clear the search.'
                : 'Convert a quote or raise an order and it will appear here.'
            }
          />
        </Card>
      </div>

      {/* No /sales/orders/:id route in this build, so "open" is a dialog
          rather than a link — a real affordance beats a dead one. */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Order ${selected.number}` : ''}
        subtitle={selected?.customer}
        size="sm"
        footer={
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        <dl className="nx-order-list__detail">
          {detailRows.map((row) => (
            <div className="nx-order-list__detail-row" key={row.label}>
              <dt className="nx-order-list__detail-label">{row.label}</dt>
              <dd className="nx-order-list__detail-value">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Modal>
    </div>
  );
}
