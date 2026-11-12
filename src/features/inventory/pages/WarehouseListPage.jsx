/**
 * ArkCRM — WarehouseListPage
 * ---------------------------------------------------------------------------
 * The warehouse directory. Four locations exist, so this is a card grid
 * rather than a table: at this size column headers, sorting and a pager would
 * be more chrome than content, and a grid keeps each location's code, city and
 * manager readable without a horizontal scan.
 *
 * "New warehouse" opens a validated modal that POSTs to /warehouses. The mock
 * echoes the body back without the fields it would normally derive (SKU count,
 * stock value, status), so the stats footer renders only when the record
 * actually carries them — a freshly created row shows name, code, city and
 * manager until the backend computes the rest.
 */

import { useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiBox, FiMapPin, FiPlus, FiRefreshCw, FiUser } from 'react-icons/fi';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import EmptyState from '@/components/feedback/EmptyState';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import { useGetWarehousesQuery, useCreateWarehouseMutation } from '../api/inventoryApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { validateForm, required, sku } from '@/utils/validators';
import './WarehouseListPage.css';
import { serverMessage } from '@/utils/errorMessage';

const EMPTY_FORM = { name: '', code: '', city: '', manager: '' };

/* Skeleton keys are fixed, so a re-render never remounts the placeholders. */
const SKELETONS = ['wh-skel-1', 'wh-skel-2', 'wh-skel-3', 'wh-skel-4'];

export default function WarehouseListPage() {
  const notify = useNotify();
  const { currency } = useTenant();
  const nameRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  /* No <DataTable> here, so the hook only owns search — but it still hands
     back the `queryParams` shape the endpoint expects. The page size covers
     the whole directory on purpose: the grid has no pager to page through. */
  const table = useDataTable({ tableName: 'warehouses', initialPageSize: 24 });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetWarehousesQuery(table.queryParams);
  const [createWarehouse, { isLoading: isCreating }] = useCreateWarehouseMutation();

  const warehouses = useMemo(() => data?.items ?? [], [data]);

  const cityCount = useMemo(
    () => new Set(warehouses.map((warehouse) => warehouse.city).filter(Boolean)).size,
    [warehouses],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing warehouses');
  };

  const openModal = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError('');
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const setField = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    /* Clear the field's error as soon as the user starts fixing it, so the
       form never shows a stale red message next to corrected input. */
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { valid, errors: next } = validateForm(form, {
      name: [required],
      code: [required, sku],
      city: [required],
      manager: [required],
    });
    setErrors(next);
    setSubmitError('');
    if (!valid) return;

    try {
      const name = form.name.trim();
      await createWarehouse({
        name,
        code: form.code.trim().toUpperCase(),
        city: form.city.trim(),
        manager: form.manager.trim(),
      }).unwrap();
      
      setForm(EMPTY_FORM);
      setErrors({});
      setIsModalOpen(false);
    } catch (err) {
      setSubmitError(serverMessage(err, 'Could not save the warehouse.'));
    }
  };

  if (isError) {
    return (
      <div className="page nx-warehouses">
        <Card padding="lg">
          <div className="nx-warehouses__error">
            <h1 className="nx-warehouses__error-title">Could not load warehouses</h1>
            <p className="nx-warehouses__error-text">
              {serverMessage(error, 'The warehouse directory is unavailable right now.')}
            </p>
            <Button onClick={refetch}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-warehouses">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Inventory</span>
          <h1 className="page__title">Warehouses</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading warehouses…'
              : `${data?.total ?? warehouses.length} ${
                  (data?.total ?? warehouses.length) === 1 ? 'location' : 'locations'
                } across ${cityCount} ${cityCount === 1 ? 'city' : 'cities'}`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh warehouses"
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />} onClick={openModal}>
            New warehouse
          </Button>
        </div>
      </div>

      <div className="page__body">
        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Name, code, city, manager"
            onRefresh={refetch}
            isFetching={isFetching}
          />
        </Card>

        {isLoading ? (
          <div role="status">
            <span className="sr-only">Loading warehouses…</span>
            <ul className="grid grid--auto nx-warehouses__grid" aria-busy="true">
              {SKELETONS.map((key) => (
                <li key={key} className="nx-warehouses__card nx-warehouses__card--skel" aria-hidden="true">
                  <span className="skeleton skeleton--title" />
                  <span className="skeleton skeleton--text" />
                  <span className="skeleton skeleton--text" />
                  <span className="skeleton skeleton--text" />
                </li>
              ))}
            </ul>
          </div>
        ) : warehouses.length === 0 ? (
          <EmptyState
            icon={<FiBox size={20} />}
            filtered={table.isFiltered}
            title="No warehouses yet"
            description="Add your first location and it will appear here."
            action={
              <Button variant="primary" leftIcon={<FiPlus size={15} />} onClick={openModal}>
                New warehouse
              </Button>
            }
          />
        ) : (
          <ul className="grid grid--auto nx-warehouses__grid">
            {warehouses.map(
              ({ id, name, code, city, manager, status, isPrimary, skuCount, totalValue }) => (
                <li key={id} className="nx-warehouses__card card-hover">
                  <div className="nx-warehouses__head">
                    <h2 className="nx-warehouses__name">{name}</h2>
                    {isPrimary || status ? (
                      <span className="nx-warehouses__badges">
                        {isPrimary ? <Badge tone="accent">Primary</Badge> : null}
                        {/* The word carries the state: colour alone would be
                            invisible to a colourblind reader. */}
                        {status ? (
                          <Badge tone={status === 'ONLINE' ? 'success' : 'warning'} dot>
                            {status === 'ONLINE' ? 'Online' : 'Offline'}
                          </Badge>
                        ) : null}
                      </span>
                    ) : null}
                  </div>

                  <span className="nx-warehouses__code">{code}</span>

                  <ul className="nx-warehouses__rows">
                    <li className="nx-warehouses__row">
                      <FiMapPin size={14} className="nx-warehouses__row-icon" aria-hidden="true" />
                      <span className="nx-warehouses__row-text">{city}</span>
                    </li>
                    <li className="nx-warehouses__row">
                      <FiUser size={14} className="nx-warehouses__row-icon" aria-hidden="true" />
                      <span className="nx-warehouses__row-text">{manager}</span>
                    </li>
                  </ul>

                  {/* Derived stats only exist on seeded records; a row created
                      from this page skips the footer until they are computed. */}
                  {skuCount != null || totalValue != null ? (
                    <div className="nx-warehouses__foot">
                      <span>{skuCount != null ? `${skuCount} SKUs` : '—'}</span>
                      <span className="nx-warehouses__value">
                        {totalValue != null
                          ? formatCurrency(totalValue, { currency, compact: true })
                          : '—'}
                      </span>
                    </div>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title="New warehouse"
        subtitle="Add the location, its code and the person who runs it."
        initialFocusRef={nameRef}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="nx-warehouse-create" variant="primary" loading={isCreating}>
              Create warehouse
            </Button>
          </>
        }
      >
        <form id="nx-warehouse-create" className="nx-warehouses__form" onSubmit={handleSubmit} noValidate>
          {submitError ? (
            <div className="nx-alert nx-alert--error" role="alert">
              <span className="nx-alert__icon" aria-hidden="true">
                <FiAlertCircle size={16} />
              </span>
              {submitError}
            </div>
          ) : null}

          <Input
            ref={nameRef}
            label="Warehouse name"
            name="warehouse-name"
            placeholder="e.g. Lagos Central Hub"
            value={form.name}
            onChange={setField('name')}
            error={errors.name}
            required
          />

          <div className="nx-warehouses__form-row">
            <Input
              label="Code"
              name="warehouse-code"
              placeholder="LOS-CEN"
              value={form.code}
              onChange={setField('code')}
              error={errors.code}
              hint="3–32 letters, numbers or dashes"
              required
            />
            <Input
              label="City"
              name="warehouse-city"
              placeholder="Lagos"
              value={form.city}
              onChange={setField('city')}
              error={errors.city}
              required
            />
          </div>

          <Input
            label="Manager"
            name="warehouse-manager"
            placeholder="Full name"
            value={form.manager}
            onChange={setField('manager')}
            error={errors.manager}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
