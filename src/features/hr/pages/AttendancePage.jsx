/**
 * NexERP — AttendancePage
 * ---------------------------------------------------------------------------
 * The register: who is in, who is not, and the numbers the summary endpoint
 * reports for the whole table.
 *
 * Status filtering is server-side (scalar `statusKey`, exact match, honest
 * totals). Seven statuses is more than four, so the toolbar filter is a
 * select — the convention utility.css states for anything past four. The KPI
 * tiles read the summary endpoint rather than the page; each hint says which
 * register it describes. Check in / check out only report what the API says.
 */

import { useMemo, useState } from 'react';
import { FiClock, FiLogIn, FiLogOut, FiRefreshCw, FiUsers } from 'react-icons/fi';
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
  useGetAttendanceQuery,
  useGetAttendanceSummaryQuery,
} from '../api/hrApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { formatPercent } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import './AttendancePage.css';

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

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

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
        sortable: true,
        render: (entry) => (
          <span className="nx-attend__hours" data-overtime={entry.overtimeHours > 0 || undefined}>
            {entry.overtimeHours > 0 ? `+${entry.overtimeHours}h` : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: false,
        render: (entry) => (
          <Badge tone={entry.status?.tone ?? 'neutral'} dot>
            {entry.status?.label ?? entry.statusKey}
          </Badge>
        ),
      },
    ],
    [],
  );

  const table = useDataTable({
    tableName: 'attendance',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetAttendanceQuery(
    table.queryParams,
  );
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useGetAttendanceSummaryQuery();

  const [checkIn] = useCheckInMutation();
  const [checkOut] = useCheckOutMutation();

  const rows = useMemo(() => data?.items ?? [], [data]);
  const status = table.filters.statusKey ?? '';

  /* The tiles describe the register through the summary endpoint, so they
     keep their own loading and failure states — a broken summary must not
     blank the table, and a slow table must not stall the tiles. */
  const kpis = useMemo(() => {
    const available = summary && !summaryError;
    const tile = (key, label, value, tone, hint) => ({ key, label, value, icon: <FiClock size={14} />, tone, hint });

    return [
      tile(
        'present',
        'Present',
        available ? String(summary.present) : '—',
        available && summary.present > 0 ? 'success' : 'neutral',
        available ? 'Whole register' : 'Summary unavailable',
      ),
      tile(
        'absent',
        'Absent',
        available ? String(summary.absent) : '—',
        available && summary.absent > 0 ? 'danger' : 'neutral',
        available ? 'Whole register' : 'Summary unavailable',
      ),
      tile(
        'late',
        'Late',
        available ? String(summary.late) : '—',
        available && summary.late > 0 ? 'warning' : 'neutral',
        available ? 'Whole register' : 'Summary unavailable',
      ),
      tile(
        'on-leave',
        'On leave',
        available ? String(summary.onLeave) : '—',
        'violet',
        available ? 'Whole register' : 'Summary unavailable',
      ),
      tile(
        'rate',
        'Attendance rate',
        available ? formatPercent(summary.rate, 1, false) : '—',
        'accent',
        available ? 'Reported by the API' : 'Summary unavailable',
      ),
    ];
  }, [summary, summaryError]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    /* The demo API acknowledges the punch but writes no row, so only the
       summary is refreshed — inventing a table row would be a lie. */
    try {
      await checkIn().unwrap();
      notify.success('Checked in');
      refetchSummary();
    } catch (err) {
      notify.error(err?.data?.message ?? 'Could not check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      await checkOut().unwrap();
      notify.success('Checked out');
      refetchSummary();
    } catch (err) {
      notify.error(err?.data?.message ?? 'Could not check out');
    } finally {
      setCheckingOut(false);
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
              {error?.data?.message ?? 'The attendance register is unavailable right now.'}
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
                value={status}
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
            isFiltered={table.isFiltered}
            itemLabel="entries"
            emptyIcon={<FiClock />}
            emptyTitle={table.isFiltered ? 'No entries match' : 'No attendance yet'}
            emptyDescription={
              table.isFiltered
                ? 'Try a different status filter or clear the search.'
                : 'Clock-ins and imported records will appear here.'
            }
          />
        </Card>
      </div>
    </div>
  );
}
