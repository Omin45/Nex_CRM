/**
 * ArkCRM — AttendancePage
 * ---------------------------------------------------------------------------
 * The register: who is in, who is not, and the numbers the summary endpoint
 * reports for the whole table.
 *
 * Status filtering is server-side (scalar `statusKey`, exact match, honest
 * totals). Seven statuses is more than four, so the toolbar filter is a
 * select — the convention utility.css states for anything past four. The KPI
 * tiles read the summary endpoint rather than the page; each hint says which
 * register it describes.
 *
 * Every punch is a real row: the header buttons record the signed-in user,
 * and each row can be checked in, checked out or removed on its own. A row
 * that was recorded in error is removed rather than left to confuse the
 * register — which is why the delete is a first-class action here.
 */

import { useMemo, useState } from 'react';
import { FiClock, FiLogIn, FiLogOut, FiRefreshCw, FiTrash2, FiUsers } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import MetricCard from '@/features/dashboard/components/MetricCard';
import {
  useCheckInMutation,
  useCheckOutMutation,
  useDeleteAttendanceMutation,
  useGetAttendanceQuery,
  useGetAttendanceSummaryQuery,
} from '../api/hrApi';
import { useNotify } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';
import useDataTable from '@/hooks/useDataTable';
import { formatPercent } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import './AttendancePage.css';
import { serverMessage } from '@/utils/errorMessage';

/* Past four options a select beats a pill row — see the header note. */
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Late' },
  { value: 'HALF_DAY', label: 'Half day' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'HOLIDAY', label: 'Holiday' },
];

export default function AttendancePage() {
  const notify = useNotify();
  const { user } = useAuth();

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  /** The row being acted on, so only its buttons spin. */
  const [pendingId, setPendingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const columns = useMemo(
    () => [
      {
        key: 'employee',
        header: 'Employee',
        sortable: true,
        render: (entry) => (
          <div className="nx-attend__cell">
            <span className="nx-attend__mark" aria-hidden="true">
              <FiUsers size={14} />
            </span>
            <div className="nx-attend__ident">
              <strong className="nx-attend__name">{entry.employee}</strong>
              <span className="nx-attend__meta">{entry.department}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        render: (entry) => <span className="nx-attend__date">{formatDate(entry.date)}</span>,
      },
      {
        key: 'clockIn',
        header: 'Clock in',
        /* Time strings sort lexicographically ("9:02" after "16:05"), so the
           column stays unsorted rather than lying in ascending order. */
        sortable: false,
        render: (entry) => <span className="nx-attend__time">{entry.clockIn}</span>,
      },
      {
        key: 'clockOut',
        header: 'Clock out',
        sortable: false,
        render: (entry) => <span className="nx-attend__time">{entry.clockOut}</span>,
      },
      {
        key: 'hours',
        header: 'Hours',
        align: 'right',
        sortable: true,
        render: (entry) => <span className="nx-attend__hours">{entry.hours}h</span>,
      },
      {
        key: 'overtimeHours',
        header: 'Overtime',
        align: 'right',
        render: (entry) => (
          <span className="nx-attend__hours" data-overtime={entry.overtimeHours > 0 || undefined}>
            {entry.overtimeHours > 0 ? `+${entry.overtimeHours}h` : '-'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (entry) => (
          <Badge tone={entry.status?.tone ?? 'neutral'} dot>
            {entry.status?.label ?? entry.statusKey}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        sortable: false,
        hideable: false,
        render: (entry) => (
          <div className="nx-attend__actions">
            <button
              type="button"
              className="nx-attend__action"
              onClick={() => handlePunch(entry, 'in')}
              disabled={pendingId === entry.id}
              aria-label={`Check ${entry.employee} in`}
              title="Check in"
            >
              <FiLogIn size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="nx-attend__action"
              onClick={() => handlePunch(entry, 'out')}
              disabled={pendingId === entry.id}
              aria-label={`Check ${entry.employee} out`}
              title="Check out"
            >
              <FiLogOut size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="nx-attend__action nx-attend__action--danger"
              onClick={() => handleRemove(entry)}
              disabled={removingId === entry.id}
              aria-label={`Remove ${entry.employee}'s entry`}
              title="Remove entry"
            >
              <FiTrash2 size={13} aria-hidden="true" />
            </button>
          </div>
        ),
      },
    ],
    // handlePunch / handleRemove are stable enough for this table; they read
    // the current entry, not the render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingId, removingId],
  );

  const table = useDataTable({
    tableName: 'attendance',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetAttendanceQuery(table.queryParams);
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useGetAttendanceSummaryQuery();

  const [checkIn] = useCheckInMutation();
  const [checkOut] = useCheckOutMutation();
  const [deleteAttendance] = useDeleteAttendanceMutation();

  const rows = useMemo(() => data?.items ?? [], [data]);

  const kpis = useMemo(() => {
    /* The tiles describe the register through the summary endpoint, so they
       keep their own loading and failure states - a broken summary must not
       take the table down with it. */
    const available = summary && !summaryError;

    return [
      {
        key: 'present',
        label: 'Present',
        value: available ? String(summary.present) : '-',
        tone: available && summary.present > 0 ? 'success' : 'neutral',
        hint: available ? 'Whole register' : 'Summary unavailable',
      },
      {
        key: 'absent',
        label: 'Absent',
        value: available ? String(summary.absent) : '-',
        tone: available && summary.absent > 0 ? 'danger' : 'neutral',
        hint: available ? 'Whole register' : 'Summary unavailable',
      },
      {
        key: 'late',
        label: 'Late',
        value: available ? String(summary.late) : '-',
        tone: available && summary.late > 0 ? 'warning' : 'neutral',
        hint: available ? 'Whole register' : 'Summary unavailable',
      },
      {
        key: 'on-leave',
        label: 'On leave',
        value: available ? String(summary.onLeave) : '-',
        tone: available && summary.onLeave > 0 ? 'info' : 'neutral',
        hint: available ? 'Whole register' : 'Summary unavailable',
      },
      {
        key: 'rate',
        label: 'Attendance rate',
        value: available ? formatPercent(summary.rate, 1, false) : '-',
        tone: available ? 'success' : 'neutral',
        hint: available ? 'Reported by the API' : 'Summary unavailable',
      },
    ];
  }, [summary, summaryError]);

  /** The signed-in user, so the header buttons record their own attendance. */
  const me = useMemo(() => (user?.email ? { email: user.email } : {}), [user]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await checkIn(me).unwrap();
      
      refetchSummary();
    } catch (err) {
      notify.error(serverMessage(err, 'Could not check in'));
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      await checkOut(me).unwrap();
      
      refetchSummary();
    } catch (err) {
      notify.error(serverMessage(err, 'Could not check out'));
    } finally {
      setCheckingOut(false);
    }
  };

  /** Check one person in or out, from their row. */
  const handlePunch = async (entry, direction) => {
    setPendingId(entry.id);
    try {
      if (direction === 'in') {
        await checkIn({ employeeId: entry.employeeId }).unwrap();
        
      } else {
        await checkOut({ employeeId: entry.employeeId }).unwrap();
        
      }
    } catch (err) {
      notify.error(serverMessage(err, `Could not check ${entry.employee} ${direction}`));
    } finally {
      setPendingId(null);
    }
  };

  /** Remove a register entry that was recorded in error. */
  const handleRemove = async (entry) => {
    const confirmed = window.confirm(
      `Remove ${entry.employee}'s entry for ${formatDate(entry.date)}?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    setRemovingId(entry.id);
    try {
      await deleteAttendance(entry.id).unwrap();
      
    } catch (err) {
      notify.error(serverMessage(err, 'Could not remove the entry'));
    } finally {
      setRemovingId(null);
    }
  };

  const handleRefresh = () => {
    refetch();
    refetchSummary();
    notify.info('Refreshing attendance');
  };

  if (isError) {
    return (
      <div className="page nx-attend">
        <Card padding="lg">
          <div className="nx-attend__error">
            <h1 className="nx-attend__error-title">Could not load attendance</h1>
            <p className="nx-attend__error-text">
              {serverMessage(error, 'The attendance register is unavailable right now.')}
            </p>
            <Button onClick={handleRefresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-attend">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">People</span>
          <h1 className="page__title">Attendance</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading the register…'
              : `${data?.total ?? rows.length} ${
                  (data?.total ?? rows.length) === 1 ? 'entry' : 'entries'
                } in the register`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="success"
            size="sm"
            leftIcon={<FiLogIn size={15} />}
            loading={checkingIn}
            onClick={handleCheckIn}
          >
            Check in
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FiLogOut size={15} />}
            loading={checkingOut}
            onClick={handleCheckOut}
          >
            Check out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh attendance"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="page__body">
        <div className="grid grid--metrics">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={summaryLoading} />
          ))}
        </div>

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Employee or department"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
            activeFilterCount={table.activeFilterCount}
            onClearFilters={table.clearFilters}
          >
            <div className="nx-attend__status">
              <Input
                as="select"
                size="sm"
                fullWidth={false}
                label="Status"
                name="attendance-status"
                value={table.filters.statusKey ?? ''}
                onChange={(event) => table.setFilter('statusKey', event.target.value)}
                options={STATUS_OPTIONS}
                containerClassName="nx-attend__status-field"
              />
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
            itemLabel="entries"
            emptyIcon={<FiClock />}
            emptyTitle="No attendance entries"
            emptyDescription="Check someone in and the register fills up."
          />
        </Card>
      </div>
    </div>
  );
}
