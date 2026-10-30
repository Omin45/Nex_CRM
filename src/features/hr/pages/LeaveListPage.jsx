/**
 * NexERP — LeaveListPage
 * ---------------------------------------------------------------------------
 * The approval queue: every request with its decision gate kept in the row —
 * Pending rows carry Approve and Reject, every other state is terminal.
 *
 * Status filtering is server-side (scalar `statusKey`, exact match, honest
 * totals) and the KPI row describes the page on screen. "Request leave"
 * posts a real PENDING record seeded with the fields the mock will not
 * derive (`employee`, `department`, `days`, `status`, `appliedAt`); the
 * employee list is fetched only while the dialog is open.
 */

import { useCallback, useMemo, useState } from 'react';
import { FiCalendar, FiCheck, FiCheckCircle, FiPlus, FiRefreshCw, FiX, FiXCircle } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useCreateLeaveMutation, useDecideLeaveMutation, useGetEmployeesQuery, useGetLeavesQuery } from '../api/hrApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { LEAVE_STATUS } from '@/config/constants';
import { validateForm, schemas } from '@/utils/validators';
import { daysBetween, formatDate, toDateInputValue } from '@/utils/date';
import './LeaveListPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

/* Mirror of the fixture vocabulary — the fixture's list is private. */
const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Bereavement', 'Unpaid', 'Study'];

function emptyForm() {
  return {
    employeeId: '',
    leaveType: '',
    startDate: toDateInputValue(new Date()),
    endDate: '',
    reason: '',
  };
}

export default function LeaveListPage() {
  const notify = useNotify();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  /* The row and decision being acted on, so only that button spins. */
  const [pending, setPending] = useState(null);

  const [createLeave, { isLoading: isSaving }] = useCreateLeaveMutation();
  const [decideLeave] = useDecideLeaveMutation();

  const handleDecision = useCallback(
    async (leave, decision) => {
      setPending({ id: leave.id, decision });
      try {
        await decideLeave({ id: leave.id, decision }).unwrap();
        notify.success(
          decision === 'APPROVED'
            ? `${leave.employee}'s leave approved`
            : `${leave.employee}'s leave rejected`,
        );
      } catch (err) {
        notify.error(err?.data?.message ?? 'Could not update the request');
      } finally {
        setPending(null);
      }
    },
    [decideLeave, notify],
  );

  const columns = useMemo(
    () => [
      {
        key: 'employee',
        header: 'Employee',
        sortable: true,
        render: (leave) => (
          <div className="nx-leave__cell">
            <span className="nx-leave__mark" aria-hidden="true">
              <FiCalendar size={14} />
            </span>
            <div className="nx-leave__ident">
              <strong className="nx-leave__name">{leave.employee}</strong>
              <span className="nx-leave__meta">{leave.department}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'leaveType',
        header: 'Type',
        sortable: true,
        render: (leave) => <span className="nx-leave__text">{leave.leaveType}</span>,
      },
      {
        key: 'startDate',
        header: 'Dates',
        sortable: true,
        render: (leave) => (
          <span className="nx-leave__dates">
            {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
          </span>
        ),
      },
      {
        key: 'days',
        header: 'Days',
        align: 'right',
        sortable: true,
        render: (leave) => <span className="nx-leave__days">{leave.days}d</span>,
      },
      {
        key: 'approver',
        header: 'Approver',
        sortable: true,
        render: (leave) => <span className="nx-leave__text">{leave.approver}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: false,
        render: (leave) => (
          <Badge tone={leave.status?.tone ?? 'neutral'} dot>
            {leave.status?.label ?? leave.statusKey}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Decision',
        align: 'right',
        sortable: false,
        render: (leave) => {
          /* Anything already decided gets no buttons — a second approve
             would be a lie about what the API still allows. */
          if (leave.statusKey !== 'PENDING') return null;
          const deciding = pending?.id === leave.id;
          return (
            <div className="nx-leave__actions">
              <Button
                size="xs"
                variant="success"
                leftIcon={<FiCheck size={12} />}
                loading={deciding && pending?.decision === 'APPROVED'}
                onClick={() => handleDecision(leave, 'APPROVED')}
                aria-label={`Approve ${leave.employee}'s ${leave.leaveType} leave`}
              >
                Approve
              </Button>
              <Button
                size="xs"
                variant="danger"
                leftIcon={<FiX size={12} />}
                loading={deciding && pending?.decision === 'REJECTED'}
                onClick={() => handleDecision(leave, 'REJECTED')}
                aria-label={`Reject ${leave.employee}'s ${leave.leaveType} leave`}
              >
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    /* `handleDecision` is a stable useCallback; `pending` drives which row
       spins, so the columns re-render when it changes. */
    [pending, handleDecision],
  );

  const table = useDataTable({
    tableName: 'leaves',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetLeavesQuery(
    table.queryParams,
  );

  /* Only while the dialog is open: it exists solely to populate a select. */
  const { data: employeeData } = useGetEmployeesQuery({ pageSize: 100 }, { skip: !modalOpen });
  const employees = useMemo(() => employeeData?.items ?? [], [employeeData]);

  const rows = useMemo(() => data?.items ?? [], [data]);
  const status = table.filters.statusKey ?? 'all';

  const kpis = useMemo(() => {
    const pendingCount = rows.filter((leave) => leave.statusKey === 'PENDING').length;
    const approved = rows.filter((leave) => leave.statusKey === 'APPROVED').length;
    const rejected = rows.filter((leave) => leave.statusKey === 'REJECTED').length;
    const days = rows.reduce((sum, leave) => sum + (leave.days ?? 0), 0);

    return [
      {
        key: 'awaiting',
        label: 'Awaiting decision',
        value: String(pendingCount),
        icon: <FiCalendar size={14} />,
        tone: pendingCount > 0 ? 'warning' : 'neutral',
        hint: 'On this page',
      },
      {
        key: 'approved',
        label: 'Approved',
        value: String(approved),
        icon: <FiCheckCircle size={14} />,
        tone: approved > 0 ? 'success' : 'neutral',
        hint: 'On this page',
      },
      {
        key: 'rejected',
        label: 'Rejected',
        value: String(rejected),
        icon: <FiXCircle size={14} />,
        tone: rejected > 0 ? 'danger' : 'neutral',
        hint: 'On this page',
      },
      {
        key: 'days',
        label: 'Days requested',
        value: String(days),
        icon: <FiCalendar size={14} />,
        tone: 'violet',
        hint: 'Summed on this page',
      },
    ];
  }, [rows]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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
    const { valid, errors } = validateForm(form, schemas.leave);
    const nextErrors = { ...errors };

    if (!form.employeeId) nextErrors.employeeId = 'Choose who is taking leave.';
    if (
      form.startDate &&
      form.endDate &&
      daysBetween(form.startDate, form.endDate) < 0
    ) {
      nextErrors.endDate = 'The end date must be on or after the start date.';
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const employee = employees.find((person) => person.id === form.employeeId);

    try {
      await createLeave({
        employeeId: employee.id,
        employee: employee.name,
        department: employee.department,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        days: Math.max(1, daysBetween(form.startDate, form.endDate) + 1),
        reason: form.reason.trim(),
        approver: employee.manager ?? 'Unassigned',
        appliedAt: new Date().toISOString(),
        statusKey: 'PENDING',
        status: LEAVE_STATUS.PENDING,
      }).unwrap();
      notify.success('Leave request submitted');
      closeModal();
    } catch (err) {
      notify.error(err?.data?.message ?? 'Could not submit the request');
    }
  };

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing leave requests');
  };

  if (isError) {
    return (
      <div className="page nx-leave">
        <Card padding="lg">
          <div className="nx-leave__error">
            <h1 className="nx-leave__error-title">Could not load leave requests</h1>
            <p className="nx-leave__error-text">
              {error?.data?.message ?? 'The leave register is unavailable right now.'}
            </p>
            <Button onClick={handleRefresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-leave">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">People</span>
          <h1 className="page__title">Leave requests</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading requests…'
              : `${data?.total ?? rows.length} ${
                  (data?.total ?? rows.length) === 1 ? 'request' : 'requests'
                } in the register`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh leave requests"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FiPlus size={15} />}
            onClick={() => setModalOpen(true)}
          >
            Request leave
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
            searchPlaceholder="Employee, type or department"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
            activeFilterCount={table.activeFilterCount}
            onClearFilters={table.clearFilters}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by leave status">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`nx-segmented__item${status === filter.id ? ' is-active' : ''}`}
                  aria-pressed={status === filter.id}
                  onClick={() =>
                    table.setFilter('statusKey', filter.id === 'all' ? '' : filter.id)
                  }
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
            isFiltered={table.isFiltered}
            itemLabel="requests"
            emptyIcon={<FiCalendar />}
            emptyTitle={table.isFiltered ? 'No requests match' : 'No leave requests yet'}
            emptyDescription={
              table.isFiltered
                ? 'Try a different status filter or clear the search.'
                : 'Requests submitted here will appear for approval.'
            }
          />
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Request leave"
        subtitle="Goes to the approver as pending; days are counted inclusively."
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" loading={isSaving} onClick={submitForm}>
              Submit request
            </Button>
          </>
        }
      >
        <form
          className="nx-leave__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submitForm();
          }}
        >
          <Input
            as="select"
            label="Employee"
            name="employeeId"
            required
            value={form.employeeId}
            onChange={handleChange}
            error={formErrors.employeeId}
            options={[
              { value: '', label: employees.length ? 'Select an employee' : 'Loading employees…' },
              ...employees.map((employee) => ({
                value: employee.id,
                label: `${employee.name} · ${employee.department}`,
              })),
            ]}
          />

          <div className="nx-leave__form-row">
            <Input
              as="select"
              label="Leave type"
              name="leaveType"
              required
              value={form.leaveType}
              onChange={handleChange}
              error={formErrors.leaveType}
              options={[
                { value: '', label: 'Select a type' },
                ...LEAVE_TYPES.map((type) => ({ value: type, label: type })),
              ]}
            />
            <div className="nx-leave__days-preview" aria-live="polite">
              <span className="nx-leave__days-label">Days</span>
              <span className="nx-leave__days-value">
                {form.startDate && form.endDate && daysBetween(form.startDate, form.endDate) >= 0
                  ? Math.max(1, daysBetween(form.startDate, form.endDate) + 1)
                  : '—'}
              </span>
            </div>
          </div>

          <div className="nx-leave__form-row">
            <Input
              label="From"
              name="startDate"
              type="date"
              required
              value={form.startDate}
              onChange={handleChange}
              error={formErrors.startDate}
            />
            <Input
              label="To"
              name="endDate"
              type="date"
              required
              value={form.endDate}
              onChange={handleChange}
              error={formErrors.endDate}
            />
          </div>

          <Input
            as="textarea"
            label="Reason"
            name="reason"
            required
            rows={3}
            value={form.reason}
            onChange={handleChange}
            error={formErrors.reason}
            placeholder="At least 10 characters — the approver will read this."
          />
        </form>
      </Modal>
    </div>
  );
}
