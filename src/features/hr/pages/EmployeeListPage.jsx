/**
 * ArkCRM — EmployeeListPage
 * ---------------------------------------------------------------------------
 * The people directory: headcount on screen, status at a glance, and the
 * form that adds someone to the roster.
 *
 * Status filtering is server-side — employee rows carry a scalar `statusKey`
 * beside the display `status` object, so the mock's exact-match filter
 * narrows the set and the pagination total stays honest. "New employee"
 * seeds the display fields the mock will not derive (`name`, `employeeNo`,
 * `status`); department and role mirror the fixture's private vocabulary.
 */

import { useMemo, useState } from 'react';
import { FiPlus, FiRefreshCw, FiUsers } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useCreateEmployeeMutation, useGetEmployeesQuery } from '../api/hrApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { useTenant } from '@/hooks/useTenant';
import { EMPLOYEE_STATUS } from '@/config/constants';
import { validateForm, schemas } from '@/utils/validators';
import { formatCurrency } from '@/utils/currency';
import { formatDate, toDateInputValue } from '@/utils/date';
import './EmployeeListPage.css';
import { serverMessage } from '@/utils/errorMessage';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'ON_LEAVE', label: 'On leave' },
  { id: 'SUSPENDED', label: 'Suspended' },
  { id: 'TERMINATED', label: 'Terminated' },
];

/* Mirror of the fixture vocabulary — see the header note. */
const DEPARTMENTS = [
  'Finance',
  'Sales',
  'Operations',
  'Human Resources',
  'Customer Support',
  'IT',
  'Marketing',
];

const ROLES = ['Administrator', 'Manager', 'Analyst', 'Officer', 'Executive', 'Lead'];

function emptyForm() {
  return {
    fullName: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    joinDate: toDateInputValue(new Date()),
    salary: '',
  };
}

export default function EmployeeListPage() {
  const notify = useNotify();
  const { currency } = useTenant();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const [createEmployee, { isLoading: isSaving }] = useCreateEmployeeMutation();

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Employee',
        sortable: true,
        render: (employee) => (
          <div className="nx-emp__cell">
            <span className="nx-emp__mark" aria-hidden="true">
              <FiUsers size={14} />
            </span>
            <div className="nx-emp__ident">
              <strong className="nx-emp__name">{employee.name}</strong>
              <span className="nx-emp__meta">{employee.employeeNo}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'department',
        header: 'Department',
        sortable: true,
        render: (employee) => (
          <span className="nx-emp__text">{employee.department}</span>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        sortable: true,
        render: (employee) => <span className="nx-emp__text">{employee.role}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: false,
        render: (employee) => (
          <Badge tone={employee.status?.tone ?? 'neutral'} dot>
            {employee.status?.label ?? employee.statusKey}
          </Badge>
        ),
      },
      {
        key: 'joinDate',
        header: 'Joined',
        sortable: true,
        render: (employee) => (
          <span className="nx-emp__date">{formatDate(employee.joinDate)}</span>
        ),
      },
      {
        key: 'salary',
        header: 'Salary',
        align: 'right',
        sortable: true,
        render: (employee) => (
          <span className="nx-emp__salary">
            {formatCurrency(employee.salary ?? 0, { currency })}
          </span>
        ),
      },
    ],
    [currency],
  );

  const table = useDataTable({
    tableName: 'employees',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetEmployeesQuery(
    table.queryParams,
  );

  const rows = useMemo(() => data?.items ?? [], [data]);
  const status = table.filters.statusKey ?? 'all';

  const kpis = useMemo(() => {
    const active = rows.filter((employee) => employee.statusKey === 'ACTIVE').length;
    const onLeave = rows.filter((employee) => employee.statusKey === 'ON_LEAVE').length;
    const departments = new Set(rows.map((employee) => employee.department)).size;

    return [
      {
        key: 'onscreen',
        label: 'On screen',
        value: String(rows.length),
        icon: <FiUsers size={14} />,
        tone: 'accent',
        hint: `Page ${data?.page ?? table.page} of ${data?.totalPages ?? 1}`,
      },
      {
        key: 'active',
        label: 'Active',
        value: String(active),
        icon: <FiUsers size={14} />,
        tone: active > 0 ? 'success' : 'neutral',
        hint: 'On this page',
      },
      {
        key: 'on-leave',
        label: 'On leave',
        value: String(onLeave),
        icon: <FiUsers size={14} />,
        tone: onLeave > 0 ? 'warning' : 'neutral',
        hint: 'On this page',
      },
      {
        key: 'departments',
        label: 'Departments',
        value: String(departments),
        icon: <FiUsers size={14} />,
        tone: 'violet',
        hint: 'Represented on this page',
      },
    ];
  }, [rows, data, table.page]);

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
    const { valid, errors } = validateForm(form, schemas.employee);
    setFormErrors(errors);
    if (!valid) return;

    const name = form.fullName.trim();
    const [firstName, ...rest] = name.split(/\s+/);

    try {
      await createEmployee({
        name,
        firstName,
        lastName: rest.join(' ') || firstName,
        /* The mock assigns an id and createdAt but no employee number, so the
           directory would render a blank ident without one. */
        employeeNo: `NX-${9000 + (Date.now() % 900)}`,
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.department,
        role: form.role,
        joinDate: form.joinDate,
        salary: Number(form.salary),
        statusKey: 'ACTIVE',
        status: EMPLOYEE_STATUS.ACTIVE,
        contractType: 'Full-time',
        manager: 'Unassigned',
        location: '—',
      }).unwrap();
      
      closeModal();
    } catch (err) {
      notify.error(serverMessage(err, 'Could not save the employee'));
    }
  };

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing employees');
  };

  if (isError) {
    return (
      <div className="page nx-emp">
        <Card padding="lg">
          <div className="nx-emp__error">
            <h1 className="nx-emp__error-title">Could not load employees</h1>
            <p className="nx-emp__error-text">
              {serverMessage(error, 'The people directory is unavailable right now.')}
            </p>
            <Button onClick={handleRefresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-emp">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">People</span>
          <h1 className="page__title">Employees</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading employees…'
              : `${data?.total ?? rows.length} ${
                  (data?.total ?? rows.length) === 1 ? 'person' : 'people'
                } on the roster`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh employees"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FiPlus size={15} />}
            onClick={() => setModalOpen(true)}
          >
            New employee
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
            searchPlaceholder="Name, email, number, department, role"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
            activeFilterCount={table.activeFilterCount}
            onClearFilters={table.clearFilters}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by employment status">
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
            itemLabel="employees"
            emptyIcon={<FiUsers />}
            emptyTitle={table.isFiltered ? 'No employees match' : 'No employees yet'}
            emptyDescription={
              table.isFiltered
                ? 'Try a different status filter or clear the search.'
                : 'People you add will appear here.'
            }
          />
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="New employee"
        subtitle="Joins the directory as active; you can change their status later."
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" loading={isSaving} onClick={submitForm}>
              Add employee
            </Button>
          </>
        }
      >
        <form
          className="nx-emp__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submitForm();
          }}
        >
          <Input
            label="Full name"
            name="fullName"
            required
            autoComplete="name"
            value={form.fullName}
            onChange={handleChange}
            error={formErrors.fullName}
            placeholder="e.g. Adaeze Nwosu"
          />

          <div className="nx-emp__form-row">
            <Input
              label="Work email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              error={formErrors.email}
              placeholder="name@company.com"
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={form.phone}
              onChange={handleChange}
              error={formErrors.phone}
              placeholder="+234 800 000 0000"
            />
          </div>

          <div className="nx-emp__form-row">
            <Input
              as="select"
              label="Department"
              name="department"
              required
              value={form.department}
              onChange={handleChange}
              error={formErrors.department}
              options={[
                { value: '', label: 'Select a department' },
                ...DEPARTMENTS.map((department) => ({ value: department, label: department })),
              ]}
            />
            <Input
              as="select"
              label="Role"
              name="role"
              required
              value={form.role}
              onChange={handleChange}
              error={formErrors.role}
              options={[
                { value: '', label: 'Select a role' },
                ...ROLES.map((role) => ({ value: role, label: role })),
              ]}
            />
          </div>

          <div className="nx-emp__form-row">
            <Input
              label="Join date"
              name="joinDate"
              type="date"
              required
              value={form.joinDate}
              onChange={handleChange}
              error={formErrors.joinDate}
            />
            <Input
              label="Annual salary"
              name="salary"
              type="number"
              inputMode="numeric"
              min="0"
              step="1000"
              required
              value={form.salary}
              onChange={handleChange}
              error={formErrors.salary}
              placeholder="0"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
