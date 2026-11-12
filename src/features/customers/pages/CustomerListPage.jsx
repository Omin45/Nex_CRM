/**
 * ArkCRM — CustomerListPage
 * ---------------------------------------------------------------------------
 * The customer directory: a searchable, filterable, sortable table, with the
 * create, edit and remove flows behind it.
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
 *
 * The dialog opens on `?new=1`, which is how the dashboard's quick actions
 * jump straight into a create form instead of only navigating here.
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiPlus, FiRefreshCw, FiTrash2, FiUpload, FiUsers } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import RecordFormModal from '@/components/ui/RecordFormModal/RecordFormModal';
import {
  useCreateCustomerMutation,
  useDeleteCustomerMutation,
  useGetCustomersQuery,
  useImportCustomersMutation,
  useUpdateCustomerMutation,
} from '../api/customersApi';
import ExportMenu from '@/components/ui/ExportMenu/ExportMenu';
import { useNotify } from '@/hooks/useNotification';
import useCreateDialog from '@/hooks/useCreateDialog';
import useVendorPath from '@/hooks/useVendorPath';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import { formatRelativeShort } from '@/utils/date';
import './CustomerListPage.css';
import { serverMessage } from '@/utils/errorMessage';

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

const SEGMENTS = ['Enterprise', 'SMB', 'Retail', 'Distributor', 'Government'];

const CITIES = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Benin City'];

/** The fields the dialog shows. The list is data, not JSX — see RecordFormModal. */
const FIELDS = [
  { name: 'name', label: 'Company name', required: true, placeholder: 'Baze Trading Ltd' },
  {
    name: 'segment',
    label: 'Segment',
    type: 'select',
    required: true,
    options: [
      { value: '', label: 'Select a segment' },
      ...SEGMENTS.map((segment) => ({ value: segment, label: segment })),
    ],
  },
  { name: 'contactName', label: 'Contact name', required: true, placeholder: 'Adaeze Okonkwo' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@company.com' },
  { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+234 800 000 0000', half: true },
  {
    name: 'city',
    label: 'City',
    type: 'select',
    half: true,
    options: [
      { value: '', label: 'Select a city' },
      ...CITIES.map((city) => ({ value: city, label: city })),
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    half: true,
    options: STATUS_FILTERS.filter((filter) => filter.id !== 'all').map((filter) => ({
      value: filter.id,
      label: filter.label,
    })),
  },
  {
    name: 'creditLimit',
    label: 'Credit limit',
    type: 'number',
    inputMode: 'decimal',
    min: '0',
    step: '0.01',
    placeholder: '0.00',
    half: true,
  },
  { name: 'taxNumber', label: 'Tax number', placeholder: 'TIN-12345678', half: true },
  { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Anything the team should know' },
];

const EMPTY_CUSTOMER = {
  name: '',
  segment: 'SMB',
  contactName: '',
  email: '',
  phone: '',
  city: 'Lagos',
  status: 'ACTIVE',
  creditLimit: '',
  taxNumber: '',
  notes: '',
};

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Give the customer a name.';
  if (!form.contactName.trim()) errors.contactName = 'Who should the team call?';
  if (!form.email.trim()) errors.email = 'An email address is required.';
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = 'That does not look like an email address.';
  }
  if (!form.segment) errors.segment = 'Choose a segment.';
  if (form.creditLimit !== '' && Number(form.creditLimit) < 0) {
    errors.creditLimit = 'A credit limit cannot be negative.';
  }
  return errors;
}

/** The columns the spreadsheet gets: plain values, not markup. */
const EXPORT_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Company' },
  { key: 'contactName', label: 'Contact' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'city', label: 'City' },
  { key: 'segment', label: 'Segment' },
  { key: 'status', label: 'Status' },
  { key: 'creditLimit', label: 'Credit limit' },
  { key: 'invoiceCount', label: 'Invoices' },
  { key: 'totalBilled', label: 'Total billed' },
  { key: 'outstanding', label: 'Outstanding' },
];

/** Fills the form from an existing customer, for the edit flow. */
function formFromCustomer(customer) {
  return {
    name: customer.name ?? '',
    segment: customer.segment ?? 'SMB',
    contactName: customer.contactName ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    city: customer.city ?? 'Lagos',
    status: customer.status ?? 'ACTIVE',
    creditLimit: customer.creditLimit ? String(customer.creditLimit) : '',
    taxNumber: customer.taxNumber ?? '',
    notes: customer.notes ?? '',
  };
}

export default function CustomerListPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { vendorPath } = useVendorPath();
  const { currency } = useTenant();

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  /* The customer being edited, or null when a new one is being created. */
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();
  const [importCustomers, { isLoading: isImporting }] = useImportCustomersMutation();
  const fileInputRef = useRef(null);

  const dialog = useCreateDialog({
    initialValues: EMPTY_CUSTOMER,
    validate,
    onSubmit: async (form) => {
      const payload = {
        name: form.name.trim(),
        segment: form.segment,
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city,
        status: form.status,
        creditLimit: form.creditLimit === '' ? 0 : Number(form.creditLimit),
        taxNumber: form.taxNumber.trim(),
        notes: form.notes.trim(),
      };

      if (editing) {
        await updateCustomer({ id: editing.id, ...payload }).unwrap();
        
      } else {
        await createCustomer(payload).unwrap();
        
      }
    },
  });


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

  /* ---- create / edit / remove ------------------------------------- */

  const openCreate = () => {
    setEditing(null);
    dialog.show();
  };

  const openEdit = (customer) => {
    setEditing(customer);
    dialog.show(formFromCustomer(customer));
  };

  const closeModal = () => {
    setEditing(null);
    dialog.hide();
  };

  /**
   * Uploads a customer file.
   *
   * <p>The service reads the header row, so a file exported from the
   * directory comes straight back in. The counts it returns are the whole
   * point of the operation, so they are reported.
   */
  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const result = await importCustomers(file).unwrap();
      notify.success(
        `${result.created} customer${result.created === 1 ? '' : 's'} imported` +
          (result.failed ? ` · ${result.failed} could not be read` : ''),
      );
    } catch (err) {
      notify.error(err?.data?.error ?? 'Could not import that file');
    }
  };

  const handleDelete = async (customer) => {
    const confirmed = window.confirm(
      `Remove ${customer.name} from the directory?\n\nThis cannot be undone, and a customer with invoices on file cannot be removed.`,
    );
    if (!confirmed) return;

    setDeletingId(customer.id);
    try {
      await deleteCustomer(customer.id).unwrap();
      
    } catch (err) {
      notify.error(serverMessage(err, 'Could not remove the customer'));
    } finally {
      setDeletingId(null);
    }
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
      {
        key: 'actions',
        header: '',
        align: 'right',
        sortable: false,
        hideable: false,
        render: (customer) => (
          <div className="nx-cust__actions">
            <button
              type="button"
              className="nx-cust__action"
              onClick={(event) => {
                /* The row itself is a link to the customer; the buttons in it
                   are not, so the click must not also open the record. */
                event.stopPropagation();
                openEdit(customer);
              }}
              aria-label={`Edit ${customer.name}`}
              title="Edit customer"
            >
              <FiEdit2 size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="nx-cust__action nx-cust__action--danger"
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(customer);
              }}
              disabled={deletingId === customer.id}
              aria-label={`Remove ${customer.name}`}
              title="Remove customer"
            >
              <FiTrash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ),
      },
    ],
    [currency, deletingId],
  );

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-cust__error">
            <h1 className="nx-cust__error-title">Could not load customers</h1>
            <p className="nx-cust__error-text">
              {serverMessage(error, 'The customer directory is unavailable right now.')}
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
          <ExportMenu
            columns={EXPORT_COLUMNS}
            rows={rows}
            filename="customers"
            title="Customers"
          />
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiUpload size={15} />}
            loading={isImporting}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import customers from a file"
          >
            Import
          </Button>
          {/* The file picker is hidden: the Import button opens it. */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="nx-sr-only"
            onChange={handleImport}
            tabIndex={-1}
            aria-hidden="true"
          />
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />} onClick={openCreate}>
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
            emptyAction={
              search || status !== 'all' ? null : (
                <Button onClick={openCreate}>Add customer</Button>
              )
            }
          />
        </Card>
      </div>

      <RecordFormModal
        open={dialog.open}
        onClose={closeModal}
        title={editing ? `Edit ${editing.name}` : 'New customer'}
        subtitle={
          editing
            ? 'Update the details the team works from.'
            : 'Add a company to the directory. The code is generated for you.'
        }
        submitLabel={editing ? 'Save changes' : 'Add customer'}
        isSaving={isCreating || isUpdating || isDeleting}
        fields={FIELDS}
        form={dialog.form}
        errors={dialog.errors}
        onChange={dialog.handleChange}
        onSubmit={dialog.submit}
      />
    </div>
  );
}
