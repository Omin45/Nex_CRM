/**
 * ArkCRM — ProductListPage
 * ---------------------------------------------------------------------------
 * The product catalogue: a table with server-driven search, filtering and
 * sorting.
 *
 * Unlike the customer directory, this page is genuinely server-driven. It uses
 * `useDataTable`, which owns search, sort, pagination and column visibility and
 * hands back a single `queryParams` object for the RTK Query endpoint. The mock
 * backend implements the same search -> filter -> sort -> paginate pipeline, so
 * the behaviour here matches what a real API would return — swapping the mock
 * for a live backend would not change this page at all.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBox, FiDownload, FiPlus, FiRefreshCw } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import { useCreateProductMutation, useGetProductsQuery, useGetWarehousesQuery } from '../api/inventoryApi';
import RecordFormModal from '@/components/ui/RecordFormModal/RecordFormModal';
import { useNotify } from '@/hooks/useNotification';
import useVendorPath from '@/hooks/useVendorPath';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import useCreateDialog from '@/hooks/useCreateDialog';
import { formatCurrency } from '@/utils/currency';
import './ProductListPage.css';

import ExportMenu from '@/components/ui/ExportMenu/ExportMenu';
import { serverMessage } from '@/utils/errorMessage';
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'IN_STOCK', label: 'In stock' },
  { id: 'LOW_STOCK', label: 'Low stock' },
  { id: 'OUT_OF_STOCK', label: 'Out of stock' },
];

/**
 * The mock stores `status` as a label object and derives it from `onHand` vs
 * `reorderLevel`, with no separate status key. So filtering happens by label,
 * and the id in STATUS_FILTERS is resolved through STATUS_ID below.
 */
const STATUS_ID = {
  'In stock': 'IN_STOCK',
  'Low stock': 'LOW_STOCK',
  'Out of stock': 'OUT_OF_STOCK',
  Discontinued: 'DISCONTINUED',
};

const PRODUCT_CATEGORIES = [
  'Electronics',
  'Consumables',
  'Software',
  'Hardware',
  'Networking',
  'Furniture',
  'Appliances',
];

const PRODUCT_UNITS = ['Unit', 'Box', 'Pack', 'Carton', 'Set'];

const EMPTY_PRODUCT = {
  name: '',
  sku: '',
  category: 'Electronics',
  unit: 'Unit',
  price: '',
  costPrice: '',
  onHand: '0',
  reorderLevel: '10',
  supplier: '',
  barcode: '',
  warehouseId: '',
};

function validateProduct(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name the product.';
  if (!form.sku.trim()) errors.sku = 'A SKU is required.';
  const price = Number(form.price);
  if (form.price === '' || !Number.isFinite(price) || price <= 0) {
    errors.price = 'Enter a selling price greater than zero.';
  }
  if (Number(form.onHand) < 0) errors.onHand = 'Stock cannot be negative.';
  if (Number(form.reorderLevel) < 0) errors.reorderLevel = 'The reorder level cannot be negative.';
  return errors;
}

/** The columns the spreadsheet gets: plain values, not markup. */
const EXPORT_COLUMNS = [
  { key: 'name', label: 'Product' },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'Unit' },
  { key: 'price', label: 'Selling price' },
  { key: 'costPrice', label: 'Cost price' },
  { key: 'margin', label: 'Margin %' },
  { key: 'onHand', label: 'On hand' },
  { key: 'reorderLevel', label: 'Reorder level' },
  { key: 'status', label: 'Status', value: (row) => row.status?.label ?? row.statusKey },
  { key: 'supplier', label: 'Supplier' },
];

export default function ProductListPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const vendorPath = useVendorPath();
  const { currency } = useTenant();

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Product',
        sortable: true,
        render: (product) => (
          <div className="nx-prod__cell">
            <span className="nx-prod__mark" aria-hidden="true">
              {product.name?.slice(0, 2).toUpperCase()}
            </span>
            <div className="nx-prod__ident">
              <strong className="nx-prod__name">{product.name}</strong>
              <span className="nx-prod__meta">
                {product.sku} · {product.category}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'unit',
        header: 'Unit',
        render: (product) => <span className="nx-prod__meta">{product.unit}</span>,
      },
      {
        key: 'onHand',
        header: 'On hand',
        align: 'right',
        sortable: true,
        render: (product) => (
          <span className="nx-prod__num">
            {product.onHand}
            {/* The reorder level is shown in muted text because the question
                the column answers is "is this enough?", and the comparison
                needs both numbers to be visible at once. */}
            <span className="nx-prod__reorder"> / {product.reorderLevel}</span>
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (product) => (
          <Badge tone={product.status?.tone ?? 'neutral'} dot>
            {product.status?.label ?? 'Unknown'}
          </Badge>
        ),
      },
      {
        key: 'costPrice',
        header: 'Cost',
        align: 'right',
        sortable: true,
        render: (product) => (
          <span className="nx-prod__num">{formatCurrency(product.costPrice, { currency })}</span>
        ),
      },
      {
        key: 'price',
        header: 'Price',
        align: 'right',
        sortable: true,
        render: (product) => (
          <span className="nx-prod__num nx-prod__num--strong">
            {formatCurrency(product.price, { currency })}
          </span>
        ),
      },
      {
        key: 'margin',
        header: 'Margin',
        align: 'right',
        sortable: true,
        render: (product) => (
          /* Below ~20% a margin is worth seeing in a warning colour: it is the
             number that quietly disappears as costs rise. */
          <span className="nx-prod__num" data-thin={product.margin < 20 || undefined}>
            {product.margin}%
          </span>
        ),
      },
      {
        key: 'supplier',
        header: 'Supplier',
        render: (product) => (
          <span className="nx-prod__meta nx-prod__truncate">{product.supplier}</span>
        ),
      },
    ],
    [currency],
  );

  /* `status` is deliberately local state, not a `useDataTable` filter.
     `useDataTable` folds every filter into `queryParams`, and the mock's
     collection query treats unknown params as exact-match field filters — so a
     `status=IN_STOCK` param would be matched against the product's `status`
     *object*, stringify to "[object Object]", and return zero rows. Search,
     sort and pagination stay server-side; status stays here. */
  const [status, setStatus] = useState('all');
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const { data: warehouseData } = useGetWarehousesQuery({ page: 1, pageSize: 100 });

  const warehouseOptions = useMemo(
    () => [
      { value: '', label: 'Select a warehouse' },
      ...(warehouseData?.items ?? []).map((warehouse) => ({
        value: warehouse.code,
        label: warehouse.name,
      })),
    ],
    [warehouseData],
  );

  const productFields = useMemo(
    () => [
      { name: 'name', label: 'Product name', required: true, placeholder: 'Wireless Barcode Scanner' },
      { name: 'sku', label: 'SKU', required: true, placeholder: 'ELEC-1042', half: true },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        half: true,
        options: PRODUCT_CATEGORIES.map((category) => ({ value: category, label: category })),
      },
      {
        name: 'unit',
        label: 'Unit',
        type: 'select',
        half: true,
        options: PRODUCT_UNITS.map((unit) => ({ value: unit, label: unit })),
      },
      {
        name: 'price',
        label: 'Selling price',
        type: 'number',
        inputMode: 'decimal',
        min: '0',
        step: '0.01',
        required: true,
        placeholder: '0.00',
        half: true,
      },
      {
        name: 'costPrice',
        label: 'Cost price',
        type: 'number',
        inputMode: 'decimal',
        min: '0',
        step: '0.01',
        placeholder: '0.00',
        half: true,
      },
      {
        name: 'onHand',
        label: 'Units on hand',
        type: 'number',
        min: '0',
        step: '1',
        required: true,
        placeholder: '0',
        half: true,
      },
      {
        name: 'reorderLevel',
        label: 'Reorder level',
        type: 'number',
        min: '0',
        step: '1',
        required: true,
        placeholder: '10',
        half: true,
      },
      { name: 'supplier', label: 'Supplier', placeholder: 'Baze Ventures', half: true },
      { name: 'barcode', label: 'Barcode', placeholder: '5010000000000', half: true },
      {
        name: 'warehouseId',
        label: 'Warehouse',
        type: 'select',
        half: true,
        options: warehouseOptions,
      },
    ],
    [warehouseOptions],
  );

  const dialog = useCreateDialog({
    initialValues: EMPTY_PRODUCT,
    validate: validateProduct,
    onSubmit: async (form) => {
      await createProduct({
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        unit: form.unit,
        price: Number(form.price),
        costPrice: form.costPrice === '' ? 0 : Number(form.costPrice),
        onHand: Number(form.onHand),
        reorderLevel: Number(form.reorderLevel),
        supplier: form.supplier.trim(),
        barcode: form.barcode.trim(),
        warehouseId: form.warehouseId,
      }).unwrap();
      
    },
  });

  const table = useDataTable({
    tableName: 'products',
    columns,
    initialPageSize: 15,
  });

  const { queryParams } = table;

  const { data, isLoading, isFetching, isError, error, refetch } = useGetProductsQuery(queryParams);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (status === 'all') return items;
    return items.filter((product) => STATUS_ID[product.status?.label] === status);
  }, [data, status]);

  const totals = useMemo(
    () => ({
      count: data?.total ?? rows.length,
      value: rows.reduce((sum, p) => sum + p.onHand * p.costPrice, 0),
    }),
    [data, rows],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing products');
  };

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-prod__error">
            <h1 className="nx-prod__error-title">Could not load products</h1>
            <p className="nx-prod__error-text">
              {serverMessage(error, 'The product catalogue is unavailable right now.')}
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
          <span className="page__eyebrow">Inventory</span>
          <h1 className="page__title">Products</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading the catalogue…'
              : `${totals.count} ${totals.count === 1 ? 'product' : 'products'} · ${formatCurrency(totals.value, { currency, compact: true })} at cost`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh products"
          >
            Refresh
          </Button>
          <ExportMenu
            columns={EXPORT_COLUMNS}
            rows={rows}
            filename="products"
            title="Products"
          />
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />} onClick={() => dialog.show()}>
            New product
          </Button>
        </div>
      </div>

      <div className="page__body">
        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Name, SKU, category, supplier"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by stock status">
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
            onRowClick={() => navigate(vendorPath('inventory/products'))}
            itemLabel="products"
            emptyIcon={<FiBox />}
            emptyTitle={status === 'all' ? 'No products yet' : 'No products match'}
            emptyDescription={
              status === 'all'
                ? 'Add your first product and it will appear here.'
                : 'Try a different status filter or clear the search.'
            }
          />
        </Card>
      </div>
      <RecordFormModal
        open={dialog.open}
        onClose={dialog.hide}
        title="New product"
        subtitle="Add an item to the catalogue. Its stock status follows from what is on hand."
        submitLabel="Add product"
        isSaving={isCreating}
        fields={productFields}
        form={dialog.form}
        errors={dialog.errors}
        onChange={dialog.handleChange}
        onSubmit={dialog.submit}
      />
    </div>
  );
}
