/**
 * NexERP — CustomerListPage
 * ---------------------------------------------------------------------------
 * The customer directory: a searchable, filterable, sortable table.
 *
 * Filtering is client-side. The list endpoint already accepts `search` and
 * `status`, so this could move server-side later — the call site would change
 * by one line, because all the narrowing lives in the single `rows` memo
 * below. Until the dataset is large enough for that to matter, client-side
 * keeps every keystroke instant with no request per character.
 *
 * Outstanding balance is the column the page is really about. It is sorted
 * default-first-by, because the customer you owe money to is the one you came
 * here to find.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiRefreshCw, FiUsers } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import { useGetCustomersQuery } from '../api/customersApi';
import { useNotify } from '@/hooks/useNotification';
import useVendorPath from '@/hooks/useVendorPath';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import { formatRelativeShort } from '@/utils/date';
import './CustomerListPage.css';

/** Status filter tabs. `all` is the default, not a real status. */
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'ON_HOLD', label: 'On hold' },
  { id: 'INACTIVE', label: 'Inactive' },
  { id: 'BLOCKED', label: 'Blocked' },
];

/** Tone per status, for the badge. Unknown statuses fall back to neutral
 *  rather than rendering an unstyled or alarming colour. */
const STATUS_TONE = {
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  INACTIVE: 'neutral',
  BLOCKED: 'danger',
};

const STATUS_LABEL = {
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  INACTIVE: 'Inactive',
  BLOCKED: 'Blocked',
};

export default function CustomerListPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { vendorPath } = useVendorPath();
  const { currency } = useTenant();

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  /* One request for the whole directory rather than a request per keystroke.
     64 fixtures is well inside a single page. */
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCustomersQuery({
    page: 1,
    pageSize: 100,
  });

  const customers = useMemo(() => data?.items ?? [], [data]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesStatus = status === 'all' || customer.status === status;
      const matchesSearch =
        !needle ||
        customer.name?.toLowerCase().includes(needle) ||
        customer.code?.toLowerCase().includes(needle) ||
        customer.contactName?.toLowerCase().includes(needle) ||
        customer.email?.toLowerCase().includes(needle) ||
        customer.city?.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [customers, search, status]);

  const totals = useMemo(
    () => ({
      count: rows.length,
      outstanding: rows.reduce((sum, customer) => sum + (customer.outstanding ?? 0), 0),
      overdue: rows.filter((customer) => customer.status === 'ON_HOLD').length,
    }),
    [rows],
  );

  const openCustomer = (customer) => navigate(vendorPath(customer.id));

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing customers');
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Customer',
        sortable: true,
        render: (customer) => (
          <div className="nx-cust__cell">
            <span className="nx-cust__mark" aria-hidden="true">
              {customer.name?.slice(0, 2).toUpperCase()}
            </span>
            <div className="nx-cust__ident">
              <strong className="nx-cust__name">{customer.name}</strong>
              <span className="nx-cust__meta">
                {customer.code} · {customer.city}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'contactName',
        header: 'Contact',
        render: (customer) => (
          <div className="nx-cust__contact">
            <span>{customer.contactName}</span>
            <span className="nx-cust__meta">{customer.email}</span>
          </div>
        ),
      },
      {
        key: 'segment',
        header: 'Segment',
        render: (customer) => <span className="nx-cust__segment">{customer.segment}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (customer) => (
          <Badge tone={STATUS_TONE[customer.status] ?? 'neutral'} dot>
            {STATUS_LABEL[customer.status] ?? customer.status}
          </Badge>
        ),
      },
      {
        key: 'invoiceCount',
        header: 'Invoices',
        align: 'right',
        sortable: true,
        render: (customer) => <span className="nx-cust__num">{customer.invoiceCount ?? 0}</span>,
      },
      {
        key: 'outstanding',
        header: 'Outstanding',
        align: 'right',
        sortable: true,
        render: (customer) => (
          <span
            className="nx-cust__num nx-cust__num--money"
            /* A customer owing nothing is not a problem to draw attention to. */
            data-overdue={customer.outstanding > 0 || undefined}
          >
            {formatCurrency(customer.outstanding ?? 0, { currency })}
          </span>
        ),
      },
      {
        key: 'lastActivityAt',
        header: 'Last activity',
        align: 'right',
        sortable: true,
        render: (customer) => (
          <span className="nx-cust__meta">{formatRelativeShort(customer.lastActivityAt)}</span>
        ),
      },
    ],
    [currency],
  );

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-cust__error">
            <h1 className="nx-cust__error-title">Could not load customers</h1>
            <p className="nx-cust__error-text">
              {error?.data?.message ?? 'The customer directory is unavailable right now.'}
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
          <h1 className="page__title">Customers</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading the customer directory…'
              : `${totals.count} ${totals.count === 1 ? 'customer' : 'customers'} · ${formatCurrency(totals.outstanding, { currency, compact: true })} outstanding`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh customers"
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />}>
            New customer
          </Button>
        </div>
      </div>

      <div className="page__body">
        <Card padding="none">
          <div className="toolbar">
            <div className="toolbar__group">
              <div className="nx-segmented" role="group" aria-label="Filter by status">
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

            <div className="toolbar__spacer" />

            <div className="toolbar__group nx-cust__search">
              <Input
                fullWidth={false}
                type="search"
                placeholder="Name, code, contact, city"
                aria-label="Search customers"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            data={rows}
            loading={isLoading}
            skeleton
            pageSize={rows.length || 1}
            total={rows.length}
            onRowClick={openCustomer}
            itemLabel="customers"
            emptyIcon={<FiUsers />}
            emptyTitle={search || status !== 'all' ? 'No customers match' : 'No customers yet'}
            emptyDescription={
              search || status !== 'all'
                ? 'Adjust the status filter or clear the search.'
                : 'Add your first customer and it will appear here.'
            }
          />
        </Card>
      </div>
    </div>
  );
}
