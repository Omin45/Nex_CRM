/**
 * NexERP — InventoryOverviewPage
 * ---------------------------------------------------------------------------
 * The inventory landing page: headline stock figures, a value-by-category
 * chart, warehouse utilisation, and the two lists a stock controller actually
 * works from — what needs reordering and what just moved.
 *
 * Two things drive the design here:
 *
 * 1. Low stock and out of stock are separated, not merged. They are different
 *    jobs: "reorder" versus "stop selling". Merging them into one "needs
 *    attention" number is how a shop runs out of something.
 *
 * 2. Everything is derived from one `getOverview` request. Five widgets issuing
 *    five requests would each load separately and flash independently; one
 *    request means the page appears at once or not at all.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArchive,
  FiBox,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiTrendingUp,
  FiTruck,
} from 'react-icons/fi';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import EmptyState from '@/components/feedback/EmptyState';
import LoadingState from '@/components/feedback/LoadingState';
import PieChartCard from '@/components/data-display/Charts/PieChartCard';
import BarChartCard from '@/components/data-display/Charts/BarChartCard';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetOverviewQuery, useGetProductsQuery, useGetMovementsQuery } from '../api/inventoryApi';
import { useNotify } from '@/hooks/useNotification';
import useVendorPath from '@/hooks/useVendorPath';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import { formatRelativeShort } from '@/utils/date';
import './InventoryOverviewPage.css';

/** Movement type -> badge tone. Issues are the ones worth noticing. */
const MOVE_TONE = {
  RECEIPT: 'success',
  RETURN: 'info',
  ISSUE: 'warning',
  TRANSFER: 'neutral',
  ADJUSTMENT: 'neutral',
};

export default function InventoryOverviewPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const vendorPath = useVendorPath();
  const { currency } = useTenant();

  const [category, setCategory] = useState('all');

  const { data, isLoading, isFetching, isError, error, refetch } = useGetOverviewQuery();

  /* The two problem lists. The overview already returns the summary counts;
     the product list is fetched once and narrowed here, so the two widgets can
     never disagree about what counts as low stock. */
  const { data: productData, isLoading: productsLoading } = useGetProductsQuery({
    page: 1,
    pageSize: 100,
  });

  const { data: movementData, isLoading: movementsLoading } = useGetMovementsQuery({
    page: 1,
    pageSize: 8,
  });

  const products = useMemo(() => productData?.items ?? [], [productData]);
  const movements = useMemo(() => movementData?.items ?? [], [movementData]);

  const categories = useMemo(() => {
    const names = new Set(products.map((product) => product.category).filter(Boolean));
    return ['all', ...[...names].sort()];
  }, [products]);

  const needsAttention = useMemo(
    () => products.filter((product) => product.status?.label !== 'In stock'),
    [products],
  );

  /* Split by the label rather than a `lowStock` boolean, because the fixture
     distinguishes out-of-stock from low-stock in the same field. */
  const outOfStock = useMemo(
    () => needsAttention.filter((p) => p.status?.label === 'Out of stock'),
    [needsAttention],
  );
  const lowStock = useMemo(
    () => needsAttention.filter((p) => p.status?.label === 'Low stock'),
    [needsAttention],
  );

  const byCategory = useMemo(() => {
    const rows = data?.byCategory ?? [];
    return category === 'all' ? rows : rows.filter((row) => row.name === category);
  }, [data, category]);

  const warehouses = useMemo(() => data?.warehouses ?? [], [data]);

  const kpis = useMemo(
    () => [
      {
        key: 'skus',
        label: 'Active SKUs',
        value: data?.totalSkus ?? 0,
        icon: <FiBox size={14} />,
        tone: 'accent',
        hint: `${data?.totalUnits ?? 0} units on hand`,
      },
      {
        key: 'value',
        label: 'Stock value',
        value: formatCurrency(data?.stockValue ?? 0, { currency, compact: true }),
        icon: <FiTrendingUp size={14} />,
        tone: 'success',
        hint: 'At cost price',
      },
      {
        key: 'low',
        label: 'Low stock',
        value: data?.lowStock ?? 0,
        icon: <FiAlertTriangle size={14} />,
        tone: 'warning',
        hint: 'At or below reorder level',
      },
      {
        key: 'out',
        label: 'Out of stock',
        value: data?.outOfStock ?? 0,
        icon: <FiArchive size={14} />,
        tone: 'danger',
        hint: 'Cannot be sold',
      },
    ],
    [data, currency],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing inventory');
  };

  const openProducts = () => navigate(vendorPath('inventory/products'));

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-inv__error">
            <h1 className="nx-inv__error-title">Could not load inventory</h1>
            <p className="nx-inv__error-text">
              {error?.data?.message ?? 'Stock figures are unavailable right now.'}
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
          <h1 className="page__title">Stock overview</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading stock figures…'
              : `${data?.totalSkus ?? 0} SKUs across ${warehouses.length} ${
                  warehouses.length === 1 ? 'warehouse' : 'warehouses'
                }`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh inventory"
          >
            Refresh
          </Button>
          <Button variant="outline" size="sm" leftIcon={<FiTruck size={15} />}>
            Transfer stock
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />} onClick={openProducts}>
            Add product
          </Button>
        </div>
      </div>

      <div className="page__body">
        {/* ---- KPI strip ---- */}
        <div className="grid grid--metrics">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={isLoading} />
          ))}
        </div>

        {/* ---- value + attention ---- */}
        <div className="nx-inv__split">
          <Card padding="none">
            <div className="toolbar">
              <div className="toolbar__group">
                <div className="nx-segmented" role="group" aria-label="Filter by category">
                  {categories.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`nx-segmented__item${category === option ? ' is-active' : ''}`}
                      aria-pressed={category === option}
                      onClick={() => setCategory(option)}
                    >
                      {option === 'all' ? 'All' : option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="nx-inv__chart-pad">
                <LoadingState mode="skeleton" variant="chart" />
              </div>
            ) : (
              <PieChartCard
                title="Stock value by category"
                subtitle="Valued at cost price"
                data={byCategory}
                nameKey="name"
                valueKey="value"
                currency={currency}
                height={280}
                showLegend
              />
            )}
          </Card>

          <Card padding="md">
            <Card.Header
              title="Needs reordering"
              subtitle={
                outOfStock.length > 0
                  ? `${outOfStock.length} out of stock · ${lowStock.length} low`
                  : 'Nothing critical'
              }
              action={
                <Button variant="subtle" size="sm" onClick={openProducts}>
                  View all
                </Button>
              }
            />
            <Card.Body>
              {productsLoading ? (
                <LoadingState mode="skeleton" variant="list" rows={5} />
              ) : needsAttention.length === 0 ? (
                <EmptyState
                  icon={<FiBox size={20} />}
                  title="Stock levels are healthy"
                  description="Every product is above its reorder level."
                />
              ) : (
                <ul className="nx-inv__attention">
                  {/* Out of stock first — it is the more urgent of the two. */}
                  {[...outOfStock, ...lowStock].slice(0, 6).map((product) => (
                    <li key={product.id} className="nx-inv__attention-row">
                      <div className="nx-inv__attention-main">
                        <span className="nx-inv__attention-name">{product.name}</span>
                        <span className="nx-inv__attention-sku">{product.sku}</span>
                      </div>
                      <div className="nx-inv__attention-side">
                        <span className="nx-inv__attention-qty">
                          {product.onHand} / {product.reorderLevel}
                        </span>
                        <Badge tone={product.status?.tone ?? 'neutral'}>
                          {product.status?.label ?? 'Unknown'}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </div>

        {/* ---- warehouses + movement ---- */}
        <div className="nx-inv__split nx-inv__split--even">
          <Card padding="md">
            <Card.Header
              title="Warehouse utilisation"
              subtitle={`${warehouses.length} locations`}
              action={
                <Button variant="subtle" size="sm" onClick={() => navigate(vendorPath('inventory/warehouses'))}>
                  Manage
                </Button>
              }
            />
            <Card.Body>
              {isLoading ? (
                <LoadingState mode="skeleton" variant="list" rows={3} />
              ) : (
                <ul className="nx-inv__warehouses">
                  {warehouses.map((warehouse) => (
                    <li key={warehouse.id} className="nx-inv__warehouse">
                      <div className="nx-inv__warehouse-head">
                        <span className="nx-inv__warehouse-name">
                          {warehouse.name}
                          {warehouse.isPrimary ? (
                            <Badge tone="info" className="nx-inv__primary">
                              Primary
                            </Badge>
                          ) : null}
                        </span>
                        <span className="nx-inv__warehouse-pct">{warehouse.utilisation}%</span>
                      </div>

                      {/* Native <progress> again: the value is on the element,
                          so nothing is set inline. */}
                      <progress
                        className="nx-inv__bar"
                        data-tone={warehouse.utilisation >= 85 ? 'danger' : warehouse.utilisation >= 70 ? 'warning' : 'ok'}
                        value={warehouse.utilisation}
                        max={100}
                        aria-label={`${warehouse.name} utilisation: ${warehouse.utilisation} percent`}
                      />

                      <p className="nx-inv__warehouse-meta">
                        {warehouse.skuCount} SKUs · {formatCurrency(warehouse.totalValue, { currency, compact: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>

          <Card padding="md">
            <Card.Header title="Recent stock movements" subtitle="Newest first" />
            <Card.Body>
              {movementsLoading ? (
                <LoadingState mode="skeleton" variant="list" rows={6} />
              ) : movements.length === 0 ? (
                <EmptyState
                  icon={<FiLayers size={20} />}
                  title="No movements yet"
                  description="Receipts, issues and transfers will appear here."
                />
              ) : (
                <ul className="nx-inv__movements">
                  {movements.map((movement) => {
                    const isIssue = movement.quantity < 0;
                    return (
                      <li key={movement.id} className="nx-inv__movement">
                        <span
                          className="nx-inv__movement-qty"
                          data-dir={isIssue ? 'out' : 'in'}
                        >
                          {isIssue ? '' : '+'}
                          {movement.quantity}
                        </span>
                        <div className="nx-inv__movement-main">
                          <span className="nx-inv__movement-name">{movement.productName}</span>
                          <span className="nx-inv__movement-meta">
                            {movement.reference} · {movement.reason}
                          </span>
                        </div>
                        <div className="nx-inv__movement-side">
                          <Badge tone={MOVE_TONE[movement.type] ?? 'neutral'}>
                            {movement.type}
                          </Badge>
                          <span className="nx-inv__movement-time">
                            {formatRelativeShort(movement.createdAt)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}
