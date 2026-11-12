/**
 * ArkCRM — StockTransferPage
 * ---------------------------------------------------------------------------
 * Move stock between two locations. The form asks for the product, where it
 * is leaving from, where it is going and how many units — with a live preview
 * of the route — and the right-hand panel lists every transfer already made.
 *
 * The request body is { productId, quantity, fromWarehouse, toWarehouse } with
 * warehouses sent by *name*, because that is how both the seeded movement rows
 * and GET /inventory/transfers identify a location. The backend that owns this
 * contract can swap in ids without anything here changing except that one
 * lookup.
 */

import { useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiArrowRight,
  FiBox,
  FiRefreshCw,
  FiTruck,
} from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import {
  useGetProductsQuery,
  useGetWarehousesQuery,
  useGetTransferHistoryQuery,
  useCreateTransferMutation,
} from '../api/inventoryApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { formatDate, fromNow } from '@/utils/date';
import { validateForm, required, quantity as quantityRule } from '@/utils/validators';
import './StockTransferPage.css';
import { serverMessage } from '@/utils/errorMessage';

const EMPTY_FORM = { productId: '', fromWarehouse: '', toWarehouse: '', quantity: '' };

/**
 * The mock does not store a status on transfer rows — only the POST response
 * carries one — so history rows resolve to COMPLETE unless the API says
 * otherwise, and a transfer still in flight reads as IN_TRANSIT.
 */
const STATUS_META = {
  IN_TRANSIT: { label: 'In transit', tone: 'info' },
  COMPLETE: { label: 'Complete', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

const HISTORY_COLUMNS = [
  {
    key: 'reference',
    header: 'Reference',
    sortable: true,
    render: (row) => (
      <div className="nx-trf__cell">
        <strong className="nx-trf__ref">{row.reference}</strong>
        <span className="nx-trf__meta">{row.reason}</span>
      </div>
    ),
  },
  {
    key: 'productName',
    header: 'Product',
    render: (row) => (
      <div className="nx-trf__cell">
        <span className="nx-trf__product">{row.productName}</span>
        <span className="nx-trf__meta">{row.sku}</span>
      </div>
    ),
  },
  {
    key: 'quantity',
    header: 'Qty',
    align: 'right',
    sortable: true,
    render: (row) => <span className="nx-trf__qty">{Math.abs(row.quantity)}</span>,
  },
  {
    key: 'route',
    header: 'Route',
    render: (row) => (
      <span className="nx-trf__route">
        <span className="nx-trf__wh">{row.fromWarehouse ?? '—'}</span>
        <FiArrowRight size={12} className="nx-trf__arrow" aria-hidden="true" />
        <span className="nx-trf__wh">{row.toWarehouse ?? '—'}</span>
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => {
      const meta = STATUS_META[row.status] ?? STATUS_META.COMPLETE;
      return (
        <Badge tone={meta.tone} dot>
          {meta.label}
        </Badge>
      );
    },
  },
  {
    key: 'createdAt',
    header: 'When',
    sortable: true,
    render: (row) => (
      <span className="nx-trf__when">
        <span className="nx-trf__date">{formatDate(row.createdAt, 'medium')}</span>
        <span className="nx-trf__meta">{fromNow(row.createdAt)}</span>
      </span>
    ),
  },
];

export default function StockTransferPage() {
  const notify = useNotify();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const { data: productData, isLoading: productsLoading } = useGetProductsQuery({
    page: 1,
    pageSize: 100,
  });
  const { data: warehouseData, isLoading: warehousesLoading } = useGetWarehousesQuery({
    page: 1,
    pageSize: 100,
  });

  const products = useMemo(() => productData?.items ?? [], [productData]);
  const warehouses = useMemo(() => warehouseData?.items ?? [], [warehouseData]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId) ?? null,
    [products, form.productId],
  );

  const history = useDataTable({
    tableName: 'transfers',
    columns: HISTORY_COLUMNS,
    initialPageSize: 10,
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError,
    error,
    refetch: refetchHistory,
  } = useGetTransferHistoryQuery(history.queryParams);

  const historyRows = useMemo(() => historyData?.items ?? [], [historyData]);

  const [createTransfer, { isLoading: isSaving }] = useCreateTransferMutation();

  const units = Number(form.quantity) || 0;
  const fromLabel = warehouses.find((warehouse) => warehouse.id === form.fromWarehouse)?.name ?? '';
  const toLabel = warehouses.find((warehouse) => warehouse.id === form.toWarehouse)?.name ?? '';

  const setField = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  };

  const handleRefresh = () => {
    refetchHistory();
    notify.info('Refreshing transfers');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { valid, errors: next } = validateForm(form, {
      productId: [required],
      fromWarehouse: [required],
      toWarehouse: [required],
      quantity: [required, quantityRule],
    });
    setErrors(next);
    setSubmitError('');
    if (!valid) return;

    if (form.fromWarehouse === form.toWarehouse) {
      setErrors({ toWarehouse: 'Pick a different destination' });
      return;
    }

    try {
      await createTransfer({
        productId: form.productId,
        quantity: units,
        fromWarehouse: fromLabel,
        toWarehouse: toLabel,
      }).unwrap();
      
      setForm((current) => ({ ...current, quantity: '' }));
      setErrors({});
    } catch (err) {
      setSubmitError(serverMessage(err, 'Could not start the transfer.'));
    }
  };

  if (isError) {
    return (
      <div className="page nx-trf">
        <Card padding="lg">
          <div className="nx-trf__error">
            <h1 className="nx-trf__error-title">Could not load transfers</h1>
            <p className="nx-trf__error-text">
              {serverMessage(error, 'The transfer history is unavailable right now.')}
            </p>
            <Button onClick={refetchHistory}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-trf">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Inventory</span>
          <h1 className="page__title">Stock transfer</h1>
          <p className="page__subtitle">
            {historyLoading
              ? 'Loading transfer history…'
              : `${historyData?.total ?? historyRows.length} ${
                  (historyData?.total ?? historyRows.length) === 1 ? 'transfer' : 'transfers'
                } on record · ${warehouses.length} ${
                  warehouses.length === 1 ? 'location' : 'locations'
                }`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={
              <FiRefreshCw size={15} className={historyFetching && !historyLoading ? 'nx-spin' : ''} />
            }
            onClick={handleRefresh}
            aria-label="Refresh transfer history"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="page__body">
        <div className="nx-trf__layout">
          {/* ---- form ------------------------------------------------- */}
          <Card>
            <div className="nx-trf__form-head">
              <span className="nx-trf__form-icon" aria-hidden="true">
                <FiTruck size={16} />
              </span>
              <div>
                <h2 className="nx-trf__form-title">Move stock</h2>
                <p className="nx-trf__form-sub">Send units from one location to another.</p>
              </div>
            </div>

            <form id="nx-transfer-create" className="nx-trf__form" onSubmit={handleSubmit} noValidate>
              {submitError ? (
                <div className="nx-alert nx-alert--error" role="alert">
                  <span className="nx-alert__icon" aria-hidden="true">
                    <FiAlertCircle size={16} />
                  </span>
                  {submitError}
                </div>
              ) : null}

              <Input
                as="select"
                label="Product"
                name="transfer-product"
                value={form.productId}
                onChange={setField('productId')}
                error={errors.productId}
                hint={
                  selectedProduct
                    ? `${selectedProduct.onHand} on hand · ${selectedProduct.sku}`
                    : 'Search by name or SKU'
                }
                disabled={productsLoading}
                options={[
                  { value: '', label: productsLoading ? 'Loading products…' : 'Select a product…' },
                  ...products.map((product) => ({
                    value: product.id,
                    label: `${product.name} · ${product.sku}`,
                  })),
                ]}
                required
              />

              <div className="nx-trf__legs">
                <Input
                  as="select"
                  label="From"
                  name="transfer-from"
                  value={form.fromWarehouse}
                  onChange={setField('fromWarehouse')}
                  error={errors.fromWarehouse}
                  disabled={warehousesLoading}
                  options={[
                    { value: '', label: warehousesLoading ? 'Loading…' : 'Source location' },
                    ...warehouses.map((warehouse) => ({
                      value: warehouse.id,
                      label: warehouse.name,
                    })),
                  ]}
                  required
                />

                <span className="nx-trf__leg-arrow" aria-hidden="true">
                  <FiArrowRight size={16} />
                </span>

                <Input
                  as="select"
                  label="To"
                  name="transfer-to"
                  value={form.toWarehouse}
                  onChange={setField('toWarehouse')}
                  error={errors.toWarehouse}
                  disabled={warehousesLoading}
                  options={[
                    { value: '', label: warehousesLoading ? 'Loading…' : 'Destination' },
                    ...warehouses.map((warehouse) => ({
                      value: warehouse.id,
                      label: warehouse.name,
                      /* The same shelf cannot be both ends of a transfer. */
                      disabled: warehouse.id === form.fromWarehouse,
                    })),
                  ]}
                  required
                />
              </div>

              <Input
                type="number"
                label="Quantity"
                name="transfer-quantity"
                placeholder="0"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.quantity}
                onChange={setField('quantity')}
                error={errors.quantity}
                leftIcon={<FiTruck size={15} />}
                hint={
                  selectedProduct ? `${selectedProduct.onHand} available on hand` : 'Units to move'
                }
                required
              />

              {units > 0 && fromLabel && toLabel ? (
                <p className="nx-trf__preview">
                  <span className="nx-trf__preview-label">Route</span>
                  <span className="nx-trf__preview-value">
                    <strong>{units}</strong> units
                    <span className="nx-trf__preview-arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="nx-trf__preview-dest">{toLabel}</span>
                    <span className="nx-trf__preview-from">from {fromLabel}</span>
                  </span>
                </p>
              ) : null}
            </form>

            <div className="nx-trf__form-footer">
              <Button variant="ghost" onClick={() => setForm(EMPTY_FORM)}>
                Clear
              </Button>
              <Button
                type="submit"
                form="nx-transfer-create"
                variant="primary"
                loading={isSaving}
                leftIcon={<FiTruck size={15} />}
              >
                Start transfer
              </Button>
            </div>
          </Card>

          {/* ---- history ---------------------------------------------- */}
          <Card padding="none">
            <TableToolbar
              search={history.search}
              onSearch={history.setSearch}
              searchPlaceholder="Reference, product, SKU, reason"
              columns={HISTORY_COLUMNS}
              visibleColumns={history.visibleColumns}
              onToggleColumn={history.toggleColumn}
              onRefresh={refetchHistory}
              isFetching={historyFetching}
            />

            <DataTable
              columns={HISTORY_COLUMNS}
              data={historyRows}
              loading={historyLoading}
              skeleton
              page={history.page}
              pageSize={history.pageSize}
              total={historyData?.total ?? historyRows.length}
              totalPages={historyData?.totalPages}
              onPageChange={history.setPage}
              onPageSizeChange={history.setPageSize}
              sortBy={history.sortBy}
              sortOrder={history.sortOrder}
              onSort={history.toggleSort}
              itemLabel="transfers"
              caption="Stock transfer history"
              emptyIcon={<FiTruck />}
              emptyTitle={history.isFiltered ? 'No transfers match' : 'No transfers yet'}
              emptyDescription={
                history.isFiltered
                  ? 'Try a different search term.'
                  : 'Transfers started from the form appear here.'
              }
              isFiltered={history.isFiltered}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
