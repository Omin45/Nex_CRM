/**
 * ArkCRM — StockAdjustmentPage
 * ---------------------------------------------------------------------------
 * Correct stock levels by hand: a short form on the left, the adjustment
 * history on the right, so the person doing a cycle count can see what has
 * already been recorded without leaving the page.
 *
 * The form takes a direction and a positive quantity rather than a signed
 * number — "decrease 12" is how a count sheet is actually written, and it
 * removes the classic "−−12" typo. The signed `delta` is built at submit time
 * and posted as { productId, delta, reason }, which is exactly what
 * POST /inventory/adjustments expects.
 */

import { useMemo, useState } from 'react';
import { FiAlertCircle, FiBox, FiMinus, FiPlus, FiRefreshCw, FiTrendingDown, FiTrendingUp } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import {
  useGetMovementsQuery,
  useGetProductsQuery,
  useCreateAdjustmentMutation,
} from '../api/inventoryApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { formatDate, fromNow } from '@/utils/date';
import { validateForm, required, quantity as quantityRule } from '@/utils/validators';
import './StockAdjustmentPage.css';
import { serverMessage } from '@/utils/errorMessage';

const EMPTY_FORM = { productId: '', qty: '', reason: '' };

const DIRECTIONS = [
  { id: 'increase', label: 'Increase', icon: <FiPlus size={13} /> },
  { id: 'decrease', label: 'Decrease', icon: <FiMinus size={13} /> },
];

/* A reason of one letter is noise in an audit trail, so it needs a floor. */
const reasonRule = (value) =>
  String(value ?? '').trim().length >= 3 ? '' : 'Say why in at least 3 characters';

const HISTORY_COLUMNS = [
  {
    key: 'reference',
    header: 'Reference',
    sortable: true,
    render: (row) => (
      <div className="nx-adj__cell">
        <strong className="nx-adj__ref">{row.reference}</strong>
        <span className="nx-adj__meta">{row.reason}</span>
      </div>
    ),
  },
  {
    key: 'productName',
    header: 'Product',
    render: (row) => (
      <div className="nx-adj__cell">
        <span className="nx-adj__product">{row.productName}</span>
        <span className="nx-adj__meta">{row.sku}</span>
      </div>
    ),
  },
  {
    key: 'quantity',
    header: 'Change',
    align: 'right',
    sortable: true,
    render: (row) => (
      <span className="nx-adj__qty" data-sign={row.quantity < 0 ? 'minus' : 'plus'}>
        {row.quantity > 0 ? '+' : ''}
        {row.quantity}
      </span>
    ),
  },
  {
    key: 'performedBy',
    header: 'By',
    render: (row) => <span className="nx-adj__meta">{row.performedBy}</span>,
  },
  {
    key: 'createdAt',
    header: 'When',
    sortable: true,
    render: (row) => (
      <span className="nx-adj__when">
        <span className="nx-adj__date">{formatDate(row.createdAt, 'medium')}</span>
        <span className="nx-adj__meta">{fromNow(row.createdAt)}</span>
      </span>
    ),
  },
];

export default function StockAdjustmentPage() {
  const notify = useNotify();

  const [direction, setDirection] = useState('increase');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  /* Product search lives in the select itself: load the catalogue once and
     filter on the client, which is the only thing a <select> can do anyway. */
  const { data: productData, isLoading: productsLoading } = useGetProductsQuery({
    page: 1,
    pageSize: 100,
  });
  const products = useMemo(() => productData?.items ?? [], [productData]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId) ?? null,
    [products, form.productId],
  );

  /* The history table is the movement log narrowed to adjustments — the same
     endpoint, with `type` pinned so a search never drifts into receipts. */
  const history = useDataTable({
    tableName: 'adjustments',
    columns: HISTORY_COLUMNS,
    initialPageSize: 10,
    initialFilters: { type: 'ADJUSTMENT' },
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError,
    error,
    refetch: refetchHistory,
  } = useGetMovementsQuery(history.queryParams);

  const historyRows = useMemo(() => historyData?.items ?? [], [historyData]);

  const [createAdjustment, { isLoading: isSaving }] = useCreateAdjustmentMutation();

  /* Live preview: what the count will be once this is submitted. */
  const signedQty = Number(form.qty) || 0;
  const delta = direction === 'increase' ? signedQty : -signedQty;
  const onHand = selectedProduct?.onHand ?? null;
  const nextOnHand = onHand === null ? null : Math.max(0, onHand + delta);

  const setField = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  };

  const handleRefresh = () => {
    refetchHistory();
    notify.info('Refreshing adjustments');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { valid, errors: next } = validateForm(form, {
      productId: [required],
      qty: [required, quantityRule],
      reason: [required, reasonRule],
    });
    setErrors(next);
    setSubmitError('');
    if (!valid) return;

    /* Clamping happens silently in the backend; saying it out loud here keeps
       the user from believing a correction took effect when it did not. */
    if (direction === 'decrease' && selectedProduct && signedQty > selectedProduct.onHand) {
      setErrors({ qty: `Only ${selectedProduct.onHand} on hand` });
      return;
    }

    try {
      await createAdjustment({
        productId: form.productId,
        delta,
        reason: form.reason.trim(),
      }).unwrap();
      
      setForm((current) => ({ ...current, qty: '', reason: '' }));
      setErrors({});
    } catch (err) {
      setSubmitError(serverMessage(err, 'Could not record the adjustment.'));
    }
  };

  if (isError) {
    return (
      <div className="page nx-adj">
        <Card padding="lg">
          <div className="nx-adj__error">
            <h1 className="nx-adj__error-title">Could not load adjustments</h1>
            <p className="nx-adj__error-text">
              {serverMessage(error, 'The adjustment history is unavailable right now.')}
            </p>
            <Button onClick={refetchHistory}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-adj">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Inventory</span>
          <h1 className="page__title">Stock adjustment</h1>
          <p className="page__subtitle">
            {productsLoading
              ? 'Loading products…'
              : `${products.length} ${products.length === 1 ? 'product' : 'products'} can be corrected`}
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
            aria-label="Refresh adjustment history"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="page__body">
        <div className="nx-adj__layout">
          {/* ---- form ------------------------------------------------- */}
          <Card>
            <div className="nx-adj__form-head">
              <span className="nx-adj__form-icon" aria-hidden="true">
                <FiBox size={16} />
              </span>
              <div>
                <h2 className="nx-adj__form-title">Record an adjustment</h2>
                <p className="nx-adj__form-sub">Counted a different number? Correct it here.</p>
              </div>
            </div>

            <form id="nx-adjustment-create" className="nx-adj__form" onSubmit={handleSubmit} noValidate>
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
                name="adjustment-product"
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

              <fieldset className="nx-adj__direction">
                <legend className="nx-adj__legend">Direction</legend>
                <div className="nx-segmented" role="group" aria-label="Adjustment direction">
                  {DIRECTIONS.map((option) => {
                    const isActive = direction === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`nx-segmented__item${isActive ? ' is-active' : ''}`}
                        aria-pressed={isActive}
                        onClick={() => setDirection(option.id)}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <Input
                type="number"
                label="Quantity"
                name="adjustment-qty"
                placeholder="0"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.qty}
                onChange={setField('qty')}
                error={errors.qty}
                leftIcon={direction === 'increase' ? <FiTrendingUp size={15} /> : <FiTrendingDown size={15} />}
                required
              />

              {selectedProduct ? (
                <p className="nx-adj__preview">
                  <span className="nx-adj__preview-label">After this change</span>
                  <span className="nx-adj__preview-value">
                    {selectedProduct.onHand}
                    <span className="nx-adj__preview-arrow" aria-hidden="true">
                      →
                    </span>
                    <strong>{nextOnHand}</strong>
                    <span className="nx-adj__preview-unit">units</span>
                  </span>
                </p>
              ) : null}

              <Input
                as="textarea"
                label="Reason"
                name="adjustment-reason"
                placeholder="Cycle count, damage, write-off…"
                rows={3}
                value={form.reason}
                onChange={setField('reason')}
                error={errors.reason}
                required
              />
            </form>

            <div className="nx-adj__form-footer">
              <Button variant="ghost" onClick={() => setForm(EMPTY_FORM)}>
                Clear
              </Button>
              <Button
                type="submit"
                form="nx-adjustment-create"
                variant="primary"
                loading={isSaving}
                leftIcon={<FiPlus size={15} />}
              >
                Record adjustment
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
              itemLabel="adjustments"
              caption="Stock adjustment history"
              emptyIcon={<FiBox />}
              emptyTitle={history.isFiltered ? 'No adjustments match' : 'No adjustments yet'}
              emptyDescription={
                history.isFiltered
                  ? 'Try a different search term.'
                  : 'Corrections recorded from the form appear here.'
              }
              isFiltered={history.isFiltered}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
