/**
 * NexERP — VendorListPage
 * ---------------------------------------------------------------------------
 * The platform's tenant directory: every company on NexERP, the seats it has
 * bought and the recurring revenue it contributes. Search, sort and paging
 * are server-driven through GET /vendors; the status segments stay local,
 * because a vendor row carries `status` as an *object* and folding it into
 * query params would make the mock exact-match against "[object Object]".
 *
 * Money is rendered in the platform's own base currency. A super admin reads
 * one set of platform books, not a column of mixed currencies — the tenant's
 * home `currency` is worth showing on its detail page, where it is the only
 * currency in view.
 *
 * Data: GET /vendors/stats (KPIs), GET /vendors (table), POST /vendors (the
 * "New tenant" dialog).
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBriefcase, FiCheckCircle, FiClock, FiDollarSign, FiPlus, FiRefreshCw, FiUser,
} from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useCreateVendorMutation, useGetStatsQuery, useGetVendorsQuery } from '../api/superAdminApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { fromNow } from '@/utils/date';
import { appRoutes } from '@/config/navigation.config';
import { VENDOR_STATUS } from '@/config/constants';
import './VendorListPage.css';

/* Labels match VENDOR_STATUS exactly — the filter compares them against the
   row's `status.label`, which is the only status field a vendor carries. */
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: VENDOR_STATUS.ACTIVE.label, label: 'Active' },
  { id: VENDOR_STATUS.PENDING.label, label: 'Pending' },
  { id: VENDOR_STATUS.SUSPENDED.label, label: 'Suspended' },
];

const PLANS = ['STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE'];
const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'];

const PLAN_LABELS = {
  STARTER: 'Starter',
  GROWTH: 'Growth',
  SCALE: 'Scale',
  ENTERPRISE: 'Enterprise',
};

const EMPTY_FORM = { name: '', contactName: '', email: '', city: '', plan: 'GROWTH', currency: 'NGN' };

export default function VendorListPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { currency } = useTenant();

  const [status, setStatus] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Tenant',
        render: (vendor) => (
          <div className="nx-vend__cell">
            <span className="nx-vend__mark" aria-hidden="true">
              {vendor.name?.slice(0, 2).toUpperCase()}
            </span>
            <div className="nx-vend__ident">
              <strong className="nx-vend__name">{vendor.name}</strong>
              <span className="nx-vend__meta">{vendor.city} · {vendor.id}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'contactName',
        header: 'Contact',
        render: (vendor) => (
          <div className="nx-vend__ident">
            <span className="nx-vend__contact">{vendor.contactName}</span>
            <span className="nx-vend__meta">{vendor.email}</span>
          </div>
        ),
      },
      {
        key: 'employees',
        header: 'Seats',
        align: 'right',
        sortable: true,
        render: (vendor) => <span className="nx-vend__num">{vendor.employees ?? 0}</span>,
      },
      {
        key: 'mrr',
        header: 'MRR',
        align: 'right',
        sortable: true,
        render: (vendor) => (
          <span className="nx-vend__num nx-vend__num--strong">
            {formatCurrency(vendor.mrr, { currency, compact: true })}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (vendor) => (
          <Badge tone={vendor.status?.tone ?? 'warning'} dot>
            {vendor.status?.label ?? VENDOR_STATUS.PENDING.label}
          </Badge>
        ),
      },
      {
        key: 'lastActiveAt',
        header: 'Last active',
        align: 'right',
        sortable: true,
        render: (vendor) => (
          <span className="nx-vend__num nx-vend__num--muted">{fromNow(vendor.lastActiveAt)}</span>
        ),
      },
    ],
    [currency],
  );

  const table = useDataTable({
    tableName: 'platform-vendors',
    columns,
    initialPageSize: 15,
  });

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } =
    useGetStatsQuery();
  const { data, isLoading, isFetching, isError, error, refetch } = useGetVendorsQuery(table.queryParams);
  const [createVendor, { isLoading: isCreating }] = useCreateVendorMutation();

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (status === 'all') return items;
    return items.filter((vendor) => (vendor.status?.label ?? VENDOR_STATUS.PENDING.label) === status);
  }, [data, status]);

  const kpis = useMemo(
    () => [
      {
        key: 'tenants',
        label: 'Tenants',
        value: stats?.total,
        icon: <FiBriefcase size={14} />,
        tone: 'accent',
        hint: 'Every company on NexERP',
      },
      {
        key: 'active',
        label: 'Active',
        value: stats?.active,
        icon: <FiCheckCircle size={14} />,
        tone: 'success',
        hint: 'Billing in good standing',
      },
      {
        key: 'pending',
        label: 'Pending review',
        value: stats?.pending,
        icon: <FiClock size={14} />,
        tone: 'warning',
        hint: 'Awaiting onboarding sign-off',
        to: appRoutes.admin.onboarding,
      },
      {
        key: 'mrr',
        label: 'Platform MRR',
        value: stats?.mrr != null ? formatCurrency(stats.mrr, { currency, compact: true }) : null,
        icon: <FiDollarSign size={14} />,
        tone: 'success',
        hint: 'Sum of tenant subscriptions',
        to: appRoutes.admin.subscriptions,
      },
    ],
    [stats, currency],
  );

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = {};
    if (!form.name.trim()) errors.name = 'Company name is required';
    if (!form.contactName.trim()) errors.contactName = 'Contact name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'A valid email is required';
    if (!form.city.trim()) errors.city = 'City is required';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      await createVendor({
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        city: form.city.trim(),
        plan: form.plan,
        currency: form.currency,
        country: 'NG',
        /* The mock assigns an id and createdAt and nothing else, so the
           server-owned defaults ride along with the request — otherwise the
           new row renders as a hole in the table. A real API sets these
           itself and ignores them. */
        statusKey: 'PENDING',
        status: VENDOR_STATUS.PENDING,
        employees: 0,
        modules: [],
        mrr: 0,
        invoicesIssued: 0,
        onboardingStep: 1,
        lastActiveAt: null,
      }).unwrap();

      notify.success(`${form.name.trim()} added — pending review`);
      setIsOpen(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
    } catch (err) {
      notify.error(err?.data?.message ?? 'Could not add the tenant');
    }
  };

  const handleRefresh = () => {
    refetch();
    refetchStats();
    notify.info('Refreshing the tenant directory');
  };

  if (isError && !data) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Platform</span>
            <h1 className="page__title">Vendors</h1>
            <p className="page__subtitle">The tenant directory is unavailable right now.</p>
          </div>
        </div>
        <Card padding="lg">
          <div className="nx-vend__error">
            <h2 className="nx-vend__error-title">Could not load tenants</h2>
            <p className="nx-vend__error-text">
              {error?.data?.message ?? 'The vendors endpoint did not respond. Check the API connection and try again.'}
            </p>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Platform</span>
          <h1 className="page__title">Vendors</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading tenants…'
              : `${data?.total ?? rows.length} ${(data?.total ?? rows.length) === 1 ? 'tenant' : 'tenants'} on the platform`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh tenants"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FiPlus size={15} />}
            onClick={() => setIsOpen(true)}
          >
            New tenant
          </Button>
        </div>
      </div>

      <div className="page__body">
        {statsError ? (
          <div className="nx-alert nx-alert--warning" role="status">
            <span className="nx-alert__icon" aria-hidden="true"><FiClock size={16} /></span>
            <span>Platform statistics are unavailable; the directory below is still current.</span>
          </div>
        ) : null}

        <div className="grid grid--metrics">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={statsLoading} />
          ))}
        </div>

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Name, contact, city or ID"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by tenant status">
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
            itemLabel="tenants"
            isFiltered={table.isFiltered}
            onRowClick={(vendor) => navigate(appRoutes.admin.vendorDetail(vendor.id))}
            emptyIcon={<FiBriefcase />}
            emptyTitle={status === 'all' ? 'No tenants yet' : 'No tenants match'}
            emptyDescription={
              status === 'all'
                ? 'Add the first tenant and it will appear here.'
                : 'Try a different status filter or clear the search.'
            }
          />
        </Card>
      </div>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add a tenant"
        subtitle="The company is created in a pending state until onboarding is signed off."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={isCreating}>
              Create tenant
            </Button>
          </>
        }
      >
        <form className="nx-vend__form" onSubmit={handleSubmit}>
          <Input
            label="Company name"
            name="name"
            required
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            error={formErrors.name}
            placeholder="Baze Trading Ltd"
            autoComplete="organization"
          />
          <div className="nx-vend__form-row">
            <Input
              label="Primary contact"
              name="contactName"
              required
              value={form.contactName}
              onChange={(event) => setField('contactName', event.target.value)}
              error={formErrors.contactName}
              placeholder="Adaeze Okonkwo"
              autoComplete="name"
            />
            <Input
              label="Contact email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(event) => setField('email', event.target.value)}
              error={formErrors.email}
              placeholder="adaeze@example.com"
              autoComplete="email"
            />
          </div>
          <div className="nx-vend__form-row">
            <Input
              label="City"
              name="city"
              required
              value={form.city}
              onChange={(event) => setField('city', event.target.value)}
              error={formErrors.city}
              placeholder="Lagos"
            />
            <Input
              label="Plan"
              name="plan"
              as="select"
              value={form.plan}
              onChange={(event) => setField('plan', event.target.value)}
              options={PLANS.map((plan) => ({ value: plan, label: PLAN_LABELS[plan] }))}
            />
          </div>
          <Input
            label="Billing currency"
            name="currency"
            as="select"
            value={form.currency}
            onChange={(event) => setField('currency', event.target.value)}
            options={CURRENCIES}
            hint="Used for this tenant's invoices from its first billing run."
          />
          {/* Enter inside any field submits; the dialog's primary button is
              outside the form, so the form needs its own submit path. */}
          <button type="submit" className="nx-sr-only">Create tenant</button>
        </form>
      </Modal>
    </div>
  );
}
