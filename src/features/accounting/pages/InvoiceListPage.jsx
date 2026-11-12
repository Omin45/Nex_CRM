/**
 * ArkCRM — InvoiceListPage
 * ---------------------------------------------------------------------------
 * The invoice register: server-driven search, sort and pagination, plus an
 * outstanding-balance summary above the table.
 *
 * The summary is not decoration. On a receivables screen the three numbers
 * that matter are money still owed, how much of it is late, and how much was
 * collected this period. Putting those above the table means the page answers
 * "how exposed am I?" before the reader scrolls.
 *
 * Aging is computed here from `dueDate` rather than fetched, because it is a
 * pure function of data the invoice already carries. `agingBucket` in
 * utils/currency owns the boundaries so the invoice page and the receivables
 * report can never disagree about what counts as "old".
 */

import { useMemo, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiFileText, FiPlus, FiRefreshCw, FiSend, FiTrendingUp } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import ExportMenu from '@/components/ui/ExportMenu/ExportMenu';
import RecordFormModal from '@/components/ui/RecordFormModal/RecordFormModal';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import MetricCard from '@/features/dashboard/components/MetricCard';
import {
  useCreateInvoiceMutation,
  useGetInvoicesQuery,
  useRecordPaymentMutation,
  useSendInvoiceMutation,
} from '../api/accountingApi';
import { useGetCustomersQuery } from '@/features/customers/api/customersApi';
import { useNotify } from '@/hooks/useNotification';
import { useTenant } from '@/hooks/useTenant';
import useCreateDialog from '@/hooks/useCreateDialog';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { formatDate, isOverdue, toDateInputValue } from '@/utils/date';
import './InvoiceListPage.css';
import { serverMessage } from '@/utils/errorMessage';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'SENT', label: 'Sent' },
  { id: 'PARTIALLY_PAID', label: 'Part paid' },
  { id: 'PAID', label: 'Paid' },
];

const PAYMENT_TERMS = ['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
];

/* What the spreadsheet gets. The table's columns are for rendering; these
   are for data, so they carry plain values rather than markup. */
const EXPORT_COLUMNS = [
  { key: 'number', label: 'Invoice' },
  { key: 'customer', label: 'Customer' },
  { key: 'issueDate', label: 'Issued', value: (row) => formatDate(row.issueDate) },
  { key: 'dueDate', label: 'Due', value: (row) => formatDate(row.dueDate) },
  { key: 'status', label: 'Status', value: (row) => row.status?.label ?? row.statusKey },
  { key: 'total', label: 'Total' },
  { key: 'amountPaid', label: 'Paid' },
  { key: 'balance', label: 'Balance' },
  { key: 'paymentTerms', label: 'Terms' },
  { key: 'owner', label: 'Owner' },
];

const EMPTY_INVOICE = {
  customerId: '',
  total: '',
  taxAmount: '',
  issueDate: toDateInputValue(new Date()),
  dueDate: toDateInputValue(new Date(Date.now() + 30 * 86400000)),
  paymentTerms: 'Net 30',
  notes: '',
};

const EMPTY_PAYMENT = {
  amount: '',
  method: 'BANK_TRANSFER',
  reference: '',
  paymentDate: toDateInputValue(new Date()),
};

function validateInvoice(form) {
  const errors = {};
  if (!form.customerId) errors.customerId = 'Choose the customer to bill.';
  const total = Number(form.total);
  if (form.total === '' || !Number.isFinite(total) || total <= 0) {
    errors.total = 'Enter a total greater than zero.';
  }
  if (!form.issueDate) errors.issueDate = 'Pick the issue date.';
  if (!form.dueDate) errors.dueDate = 'Pick the due date.';
  else if (form.issueDate && form.dueDate < form.issueDate) {
    errors.dueDate = 'The due date cannot be before the issue date.';
  }
  return errors;
}

function validatePayment(form) {
  const errors = {};
  const amount = Number(form.amount);
  if (form.amount === '' || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Enter an amount greater than zero.';
  }
  if (!form.paymentDate) errors.paymentDate = 'Pick the date the money arrived.';
  return errors;
}

export default function InvoiceListPage() {
  const notify = useNotify();
  const { currency } = useTenant();

  /* Local, for the same reason as the product page: a `status` filter would be
     folded into `queryParams`, and the mock would try to exact-match it against
     the invoice's `status` object. The invoice does carry a real `statusKey`,
     so this one *could* be server-side — but keeping it client-side means the
     status tabs and the server-side search compose predictably. */
  const [status, setStatus] = useState('all');

  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();
  const [recordPayment, { isLoading: isRecording }] = useRecordPaymentMutation();
  const [sendInvoice, { isLoading: isSending }] = useSendInvoiceMutation();
  const { data: customerData } = useGetCustomersQuery({ page: 1, pageSize: 100 });

  /* The invoice form needs the customer directory, so it is fetched once here
     and the picker reads it. */
  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Select a customer' },
      ...(customerData?.items ?? []).map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    ],
    [customerData],
  );

  const invoiceFields = useMemo(
    () => [
      {
        name: 'customerId',
        label: 'Customer',
        type: 'select',
        required: true,
        options: customerOptions,
      },
      {
        name: 'total',
        label: 'Invoice total',
        type: 'number',
        inputMode: 'decimal',
        min: '0',
        step: '0.01',
        required: true,
        placeholder: '0.00',
        half: true,
      },
      {
        name: 'taxAmount',
        label: 'VAT',
        type: 'number',
        inputMode: 'decimal',
        min: '0',
        step: '0.01',
        placeholder: '0.00',
        half: true,
      },
      {
        name: 'issueDate',
        label: 'Issue date',
        type: 'date',
        required: true,
        half: true,
      },
      {
        name: 'dueDate',
        label: 'Due date',
        type: 'date',
        required: true,
        half: true,
      },
      {
        name: 'paymentTerms',
        label: 'Payment terms',
        type: 'select',
        half: true,
        options: PAYMENT_TERMS.map((terms) => ({ value: terms, label: terms })),
      },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'What is this invoice for?' },
    ],
    [customerOptions],
  );

  const paymentFields = useMemo(
    () => [
      {
        name: 'amount',
        label: 'Amount received',
        type: 'number',
        inputMode: 'decimal',
        min: '0',
        step: '0.01',
        required: true,
        placeholder: '0.00',
        half: true,
      },
      {
        name: 'method',
        label: 'Method',
        type: 'select',
        half: true,
        options: PAYMENT_METHODS,
      },
      { name: 'reference', label: 'Reference', placeholder: 'TRX-10001', half: true },
      { name: 'paymentDate', label: 'Date received', type: 'date', required: true, half: true },
    ],
    [],
  );

  const invoiceDialog = useCreateDialog({
    initialValues: EMPTY_INVOICE,
    validate: validateInvoice,
    onSubmit: async (form) => {
      await createInvoice({
        customerId: form.customerId,
        total: Number(form.total),
        taxAmount: form.taxAmount === '' ? 0 : Number(form.taxAmount),
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        paymentTerms: form.paymentTerms,
        notes: form.notes.trim(),
      }).unwrap();
      
    },
  });

  /* The invoice being paid, so the dialog knows which one it is for. */
  const [paying, setPaying] = useState(null);

  const paymentDialog = useCreateDialog({
    initialValues: EMPTY_PAYMENT,
    validate: validatePayment,
    onSubmit: async (form) => {
      await recordPayment({
        id: paying.id,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference.trim(),
        paymentDate: form.paymentDate,
      }).unwrap();
      
    },
  });

  const openPayment = (invoice) => {
    setPaying(invoice);
    paymentDialog.show({ amount: invoice.balance ? String(invoice.balance) : '' });
  };

  const handleSend = async (invoice) => {
    try {
      await sendInvoice(invoice.id).unwrap();
      
    } catch (err) {
      notify.error(serverMessage(err, 'Could not send the invoice'));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'number',
        header: 'Invoice',
        sortable: true,
        render: (invoice) => (
          <div className="nx-inv-list__cell">
            <span className="nx-inv-list__mark" aria-hidden="true">
              <FiFileText size={14} />
            </span>
            <div className="nx-inv-list__ident">
              <strong className="nx-inv-list__number">{invoice.number}</strong>
              <span className="nx-inv-list__meta">{invoice.paymentTerms}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        sortable: true,
        render: (invoice) => <span className="nx-inv-list__customer">{invoice.customer}</span>,
      },
      {
        key: 'issueDate',
        header: 'Issued',
        align: 'right',
        sortable: true,
        render: (invoice) => (
          <span className="nx-inv-list__date">{formatDate(invoice.issueDate)}</span>
        ),
      },
      {
        key: 'dueDate',
        header: 'Due',
        align: 'right',
        sortable: true,
        render: (invoice) => {
          const late = invoice.balance > 0 && isOverdue(invoice.dueDate);
          return (
            <span className="nx-inv-list__date" data-late={late || undefined}>
              {formatDate(invoice.dueDate)}
              {/* The word "overdue" alongside the date: a red date alone is a
                  colour-only signal, which fails anyone who cannot see it. */}
              {late ? <span className="nx-inv-list__late-flag">overdue</span> : null}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (invoice) => (
          <Badge tone={invoice.status?.tone ?? 'neutral'} dot>
            {invoice.status?.label ?? invoice.statusKey}
          </Badge>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        sortable: true,
        render: (invoice) => (
          <span className="nx-inv-list__num nx-inv-list__num--strong">
            {formatCurrency(invoice.total, { currency })}
          </span>
        ),
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        sortable: true,
        render: (invoice) => (
          <span className="nx-inv-list__num" data-due={invoice.balance > 0 || undefined}>
            {invoice.balance > 0 ? formatCurrency(invoice.balance, { currency }) : '—'}
          </span>
        ),
      },      {
        key: 'actions',
        header: '',
        align: 'right',
        sortable: false,
        hideable: false,
        render: (invoice) => (
          <div className="nx-inv-list__actions">
            {invoice.balance > 0 ? (
              <button
                type="button"
                className="nx-inv-list__action"
                onClick={() => openPayment(invoice)}
                aria-label={`Record a payment against ${invoice.number}`}
                title="Record payment"
              >
                <FiTrendingUp size={14} aria-hidden="true" />
              </button>
            ) : null}
            {invoice.statusKey === 'DRAFT' ? (
              <button
                type="button"
                className="nx-inv-list__action"
                onClick={() => handleSend(invoice)}
                aria-label={`Send ${invoice.number}`}
                title="Send to customer"
              >
                <FiSend size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [currency, openPayment, handleSend],
  );

  const table = useDataTable({
    tableName: 'invoices',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetInvoicesQuery(table.queryParams);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (status === 'all') return items;
    return items.filter((invoice) => invoice.statusKey === status);
  }, [data, status]);

  /* The summary reflects the *page* of invoices on screen, not the whole
     ledger. Saying so in the hint avoids the number being read as a
     company-wide total. */
  const summary = useMemo(() => {
    const outstanding = rows.reduce((sum, invoice) => sum + (invoice.balance ?? 0), 0);
    const overdue = rows
      .filter((invoice) => invoice.balance > 0 && isOverdue(invoice.dueDate))
      .reduce((sum, invoice) => sum + invoice.balance, 0);
    const collected = rows.reduce((sum, invoice) => sum + (invoice.amountPaid ?? 0), 0);

    return { outstanding, overdue, collected };
  }, [rows]);

  const kpis = useMemo(
    () => [
      {
        key: 'outstanding',
        label: 'Outstanding',
        value: formatCurrency(summary.outstanding, { currency, compact: true }),
        icon: <FiAlertCircle size={14} />,
        tone: summary.outstanding > 0 ? 'warning' : 'success',
        hint: 'On this page of invoices',
      },
      {
        key: 'overdue',
        label: 'Overdue',
        value: formatCurrency(summary.overdue, { currency, compact: true }),
        icon: <FiAlertCircle size={14} />,
        tone: summary.overdue > 0 ? 'danger' : 'success',
        hint: summary.overdue > 0 ? 'Past the due date' : 'Nothing past due',
      },
      {
        key: 'collected',
        label: 'Collected',
        value: formatCurrency(summary.collected, { currency, compact: true }),
        icon: <FiCheckCircle size={14} />,
        tone: 'success',
        hint: 'Payments received',
      },
    ],
    [summary, currency],
  );

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing invoices');
  };

  if (isError) {
    return (
      <div className="page">
        <Card padding="lg">
          <div className="nx-inv-list__error">
            <h1 className="nx-inv-list__error-title">Could not load invoices</h1>
            <p className="nx-inv-list__error-text">
              {serverMessage(error, 'The invoice register is unavailable right now.')}
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
          <span className="page__eyebrow">Accounting</span>
          <h1 className="page__title">Invoices</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading invoices…'
              : `${data?.total ?? rows.length} ${
                  (data?.total ?? rows.length) === 1 ? 'invoice' : 'invoices'
                } in the register`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh invoices"
          >
            Refresh
          </Button>
          <ExportMenu
            columns={EXPORT_COLUMNS}
            rows={rows}
            filename="invoices"
            title="Invoices"
            subtitle="The invoice register as it appears on screen."
          />
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FiPlus size={15} />}
            onClick={() => invoiceDialog.show()}
          >
            New invoice
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
            searchPlaceholder="Number, customer, terms"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by invoice status">
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
            itemLabel="invoices"
            emptyIcon={<FiFileText />}
            emptyTitle={status === 'all' ? 'No invoices yet' : 'No invoices match'}
            emptyDescription={
              status === 'all'
                ? 'Raise your first invoice and it will appear here.'
                : 'Try a different status filter or clear the search.'
            }
          />
        </Card>
      </div>

      <RecordFormModal
        open={invoiceDialog.open}
        onClose={invoiceDialog.hide}
        title="New invoice"
        subtitle="Raise a draft invoice. Send it once the details are right."
        submitLabel="Raise invoice"
        isSaving={isCreating}
        fields={invoiceFields}
        form={invoiceDialog.form}
        errors={invoiceDialog.errors}
        onChange={invoiceDialog.handleChange}
        onSubmit={invoiceDialog.submit}
      />

      <RecordFormModal
        open={paymentDialog.open}
        onClose={() => {
          setPaying(null);
          paymentDialog.hide();
        }}
        title={paying ? `Payment for ${paying.number}` : 'Record payment'}
        subtitle={paying ? `${paying.customer} Â· ${formatCurrency(paying.balance ?? 0, { currency })} outstanding` : null}
        submitLabel="Record payment"
        isSaving={isRecording}
        fields={paymentFields}
        form={paymentDialog.form}
        errors={paymentDialog.errors}
        onChange={paymentDialog.handleChange}
        onSubmit={paymentDialog.submit}
      />
    </div>
  );
}
