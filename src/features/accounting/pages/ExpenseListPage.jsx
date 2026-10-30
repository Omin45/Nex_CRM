/**
 * NexERP — ExpenseListPage
 * ---------------------------------------------------------------------------
 * The expense register: server-driven search, sort and pagination, with the
 * approval gate kept visible in the row rather than hidden in a detail screen.
 *
 * The status tabs are the same client-side technique InvoiceListPage uses —
 * folding `statusKey` into `queryParams` would make the mock exact-match it
 * and compose badly with the server-side search, so the tab filters the page
 * that is already loaded.
 *
 * "New expense" posts a real record as SUBMITTED, because that is the state
 * the Approve/Reject buttons act on: create → submit → decide is one coherent
 * flow instead of a draft nobody can do anything with. Approve/Reject render
 * only for SUBMITTED rows; every other state is terminal for this screen.
 */

import { useCallback, useMemo, useState } from 'react';
import { FiCheck, FiFileText, FiPlus, FiRefreshCw, FiX } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import { useApproveExpenseMutation, useCreateExpenseMutation, useGetExpensesQuery } from '../api/accountingApi';
import { useNotify } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import useDataTable from '@/hooks/useDataTable';
import { formatCurrency } from '@/utils/currency';
import { formatDate, toDateInputValue } from '@/utils/date';
import './ExpenseListPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'DRAFT', label: 'Draft' },
];

/* The expense categories the fixtures post under. Held here rather than
   imported so the select offers a stable list even while the table loads. */
const EXPENSE_CATEGORIES = [
  'Payroll',
  'Rent & utilities',
  'Marketing',
  'Travel',
  'Software subscriptions',
  'Equipment',
  'Professional fees',
  'Logistics',
  'Maintenance',
  'Tax & duties',
];

function emptyForm() {
  return {
    description: '',
    category: '',
    amount: '',
    expenseDate: toDateInputValue(new Date()),
    vendorName: '',
  };
}

function validate(form) {
  const errors = {};
  if (!form.description.trim()) errors.description = 'Say what the expense was for.';
  if (!form.category) errors.category = 'Choose a category.';
  const amount = Number(form.amount);
  if (form.amount === '' || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Enter an amount greater than zero.';
  }
  if (!form.expenseDate) errors.expenseDate = 'Pick the expense date.';
  if (!form.vendorName.trim()) errors.vendorName = 'Name the vendor.';
  return errors;
}

export default function ExpenseListPage() {
  const notify = useNotify();
  const { currency } = useTenant();
  const { user } = useAuth();

  /* Local, for the same reason as the invoice page: the tab is a view over
     the page already on screen, not a query parameter. */
  const [status, setStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const [createExpense, { isLoading: isSaving }] = useCreateExpenseMutation();
  const [approveExpense] = useApproveExpenseMutation();
  /* The row and decision being acted on, so only that button spins. */
  const [pending, setPending] = useState(null);

  const handleDecision = useCallback(
    async (expense, decision) => {
      setPending({ id: expense.id, decision });
      try {
        await approveExpense({ id: expense.id, decision }).unwrap();
        notify.success(
          decision === 'APPROVED'
            ? `${expense.reference} approved`
            : `${expense.reference} rejected`,
        );
      } catch (err) {
        notify.error(err?.data?.message ?? `Could not update ${expense.reference}`);
      } finally {
        setPending(null);
      }
    },
    [approveExpense, notify],
  );

  const columns = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Expense',
        sortable: true,
        render: (expense) => (
          <div className="nx-exp__cell">
            <span className="nx-exp__mark" aria-hidden="true">
              <FiFileText size={14} />
            </span>
            <div className="nx-exp__ident">
              <strong className="nx-exp__number">{expense.reference}</strong>
              <span className="nx-exp__meta">{expense.description}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        sortable: true,
        render: (expense) => <span className="nx-exp__category">{expense.category}</span>,
      },
      {
        key: 'vendorName',
        header: 'Vendor',
        sortable: true,
        render: (expense) => <span className="nx-exp__vendor">{expense.vendorName}</span>,
      },
      {
        key: 'expenseDate',
        header: 'Date',
        align: 'right',
        sortable: true,
        render: (expense) => <span className="nx-exp__date">{formatDate(expense.expenseDate)}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (expense) => (
          <Badge tone={expense.status?.tone ?? 'neutral'} dot>
            {expense.status?.label ?? expense.statusKey}
          </Badge>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        sortable: true,
        render: (expense) => (
          <span className="nx-exp__num nx-exp__num--strong">
            {formatCurrency(expense.amount, { currency })}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Decision',
        align: 'right',
        render: (expense) => {
          /* Anything that is not awaiting a decision gets no buttons — a
             second approve would be a lie about what the API still allows. */
          if (expense.statusKey !== 'SUBMITTED') return null;
          const deciding = pending?.id === expense.id;
          return (
            <div className="nx-exp__actions">
              <Button
                size="xs"
                variant="success"
                leftIcon={<FiCheck size={12} />}
                loading={deciding && pending?.decision === 'APPROVED'}
                onClick={() => handleDecision(expense, 'APPROVED')}
                aria-label={`Approve ${expense.reference}`}
              >
                Approve
              </Button>
              <Button
                size="xs"
                variant="danger"
                leftIcon={<FiX size={12} />}
                loading={deciding && pending?.decision === 'REJECTED'}
                onClick={() => handleDecision(expense, 'REJECTED')}
                aria-label={`Reject ${expense.reference}`}
              >
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [currency, pending, handleDecision],
  );

  const table = useDataTable({
    tableName: 'expenses',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetExpensesQuery(table.queryParams);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (status === 'all') return items;
    return items.filter((expense) => expense.statusKey === status);
  }, [data, status]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    /* Clear only the field being fixed, so the rest of the form's errors
       stay visible while the user works through them. */
    setFormErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm());
    setFormErrors({});
  };

  const submitForm = async () => {
    const errors = validate(form);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const submittedBy =
      user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unassigned';

    try {
      await createExpense({
        description: form.description.trim(),
        category: form.category,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        vendorName: form.vendorName.trim(),
        statusKey: 'SUBMITTED',
        status: { label: 'Submitted', tone: 'info' },
        submittedBy,
      }).unwrap();
      notify.success('Expense submitted for approval');
      closeModal();
    } catch (err) {
      notify.error(err?.data?.message ?? 'Could not save the expense');
    }
  };

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing expenses');
  };

  if (isError) {
    return (
      <div className="page nx-exp">
        <Card padding="lg">
          <div className="nx-exp__error">
            <h1 className="nx-exp__error-title">Could not load expenses</h1>
            <p className="nx-exp__error-text">
              {error?.data?.message ?? 'The expense register is unavailable right now.'}
            </p>
            <Button onClick={handleRefresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  const isFiltered = status !== 'all';

  return (
    <div className="page nx-exp">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Accounting</span>
          <h1 className="page__title">Expenses</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading expenses…'
              : `${data?.total ?? 0} ${(data?.total ?? 0) === 1 ? 'expense' : 'expenses'} in the register`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh expenses"
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />} onClick={() => setModalOpen(true)}>
            New expense
          </Button>
        </div>
      </div>

      <div className="page__body">
        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Reference, description, vendor"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by expense status">
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
            itemLabel="expenses"
            emptyIcon={<FiFileText />}
            emptyTitle={isFiltered ? 'No expenses match' : 'No expenses yet'}
            emptyDescription={
              isFiltered
                ? 'Try a different status filter or clear the search.'
                : 'Record your first expense and it will appear here.'
            }
          />
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="New expense"
        subtitle="Saved as submitted and sent for approval."
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" loading={isSaving} onClick={submitForm}>
              Submit expense
            </Button>
          </>
        }
      >
        <form className="nx-exp__form" noValidate onSubmit={(event) => { event.preventDefault(); submitForm(); }}>
          <Input
            label="Description"
            name="description"
            required
            value={form.description}
            onChange={handleChange}
            error={formErrors.description}
            placeholder="What was this expense for?"
          />

          <div className="nx-exp__form-row">
            <Input
              as="select"
              label="Category"
              name="category"
              required
              value={form.category}
              onChange={handleChange}
              error={formErrors.category}
              options={[
                { value: '', label: 'Select a category' },
                ...EXPENSE_CATEGORIES.map((category) => ({ value: category, label: category })),
              ]}
            />
            <Input
              label="Amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={handleChange}
              error={formErrors.amount}
              placeholder="0.00"
            />
          </div>

          <div className="nx-exp__form-row">
            <Input
              label="Expense date"
              name="expenseDate"
              type="date"
              required
              value={form.expenseDate}
              onChange={handleChange}
              error={formErrors.expenseDate}
            />
            <Input
              label="Vendor"
              name="vendorName"
              required
              value={form.vendorName}
              onChange={handleChange}
              error={formErrors.vendorName}
              placeholder="Who was paid?"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
