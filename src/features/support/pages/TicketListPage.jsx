/**
 * ArkCRM — TicketListPage
 * ---------------------------------------------------------------------------
 * The support queue: subject, priority, SLA state, and the one action this
 * screen owns — closing a ticket that is still open.
 *
 * Everything is client-side on a single full fetch (`pageSize: 200`): the
 * fixture exposes `priority` only as a display object, so the mock's
 * exact-match filter cannot narrow by it. The KPI tiles come from the SLA
 * endpoint plus an Open count over the loaded set — the endpoint reports no
 * open or resolved-this-week figures; each hint names its source.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiActivity, FiCheckCircle, FiClock, FiFlag, FiInbox, FiPlus, FiRefreshCw, FiX } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import MetricCard from '@/features/dashboard/components/MetricCard';
import {
  useCloseTicketMutation,
  useCreateTicketMutation,
  useGetSlaMetricsQuery,
  useGetTicketsQuery,
} from '../api/supportApi';
import { useGetCustomersQuery } from '@/features/customers/api/customersApi';
import RecordFormModal from '@/components/ui/RecordFormModal/RecordFormModal';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import useCreateDialog from '@/hooks/useCreateDialog';
import { TICKET_PRIORITY } from '@/config/constants';
import { formatPercent } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import './TicketListPage.css';
import { serverMessage } from '@/utils/errorMessage';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Pending customer' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  ...Object.keys(TICKET_PRIORITY).map((key) => ({ value: key, label: TICKET_PRIORITY[key].label })),
];

/**
 * The fixture ships priority as `{ label, tone }` with no key, so the badge
 * value is mapped back through the constants to get a filterable key. A
 * future `priorityKey` field would short-circuit the lookup.
 */
function priorityKeyOf(ticket) {
  if (ticket.priority?.key) return ticket.priority.key;
  return (
    Object.entries(TICKET_PRIORITY).find(([, meta]) => meta.label === ticket.priority?.label)?.[0] ??
    ''
  );
}

const TICKET_CHANNELS = ['Email', 'Portal', 'Phone', 'Chat'];

const TICKET_CATEGORIES = [
  'TECHNICAL',
  'BILLING',
  'SALES',
  'GENERAL',
  'FEATURE_REQUEST',
  'COMPLAINT',
];

const EMPTY_TICKET = {
  subject: '',
  description: '',
  customerId: '',
  priority: 'MEDIUM',
  channel: 'Portal',
  category: 'GENERAL',
};

function validateTicket(form) {
  const errors = {};
  if (!form.subject.trim()) errors.subject = 'Summarise the request in a line.';
  if (!form.description.trim()) errors.description = 'Describe what the customer reported.';
  if (!form.customerId) errors.customerId = 'Choose the customer this is about.';
  return errors;
}

export default function TicketListPage() {
  const notify = useNotify();

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  /* Row being closed, so only that button spins. */
  const [closing, setClosing] = useState(null);

  const [closeTicket] = useCloseTicketMutation();
  const [createTicket, { isLoading: isCreating }] = useCreateTicketMutation();
  const { data: customerData } = useGetCustomersQuery({ page: 1, pageSize: 100 });

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

  const ticketFields = useMemo(
    () => [
      { name: 'subject', label: 'Subject', required: true, placeholder: 'Invoice PDF will not download' },
      { name: 'description', label: 'What happened', type: 'textarea', rows: 4, required: true },
      {
        name: 'customerId',
        label: 'Customer',
        type: 'select',
        required: true,
        options: customerOptions,
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        half: true,
        options: Object.entries(TICKET_PRIORITY).map(([key, meta]) => ({
          value: key,
          label: meta.label,
        })),
      },
      {
        name: 'channel',
        label: 'Channel',
        type: 'select',
        half: true,
        options: TICKET_CHANNELS.map((channel) => ({ value: channel, label: channel })),
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        half: true,
        options: TICKET_CATEGORIES.map((category) => ({
          value: category,
          label: category.replace(/_/g, ' ').toLowerCase(),
        })),
      },
    ],
    [customerOptions],
  );

  const dialog = useCreateDialog({
    initialValues: EMPTY_TICKET,
    validate: validateTicket,
    onSubmit: async (form) => {
      await createTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        customerId: form.customerId,
        priority: form.priority,
        channel: form.channel,
        category: form.category,
      }).unwrap();
      
    },
  });

  const handleClose = useCallback(
    async (ticket) => {
      setClosing(ticket.id);
      try {
        await closeTicket(ticket.id).unwrap();
        
      } catch (err) {
        notify.error(serverMessage(err, `Could not close ${ticket.number}`));
      } finally {
        setClosing(null);
      }
    },
    [closeTicket, notify],
  );

  const columns = useMemo(
    () => [
      {
        key: 'subject',
        header: 'Ticket',
        sortable: true,
        render: (ticket) => (
          <div className="nx-tickets__cell">
            <span className="nx-tickets__mark" aria-hidden="true">
              <FiInbox size={14} />
            </span>
            <div className="nx-tickets__ident">
              <strong className="nx-tickets__subject">{ticket.subject}</strong>
              <span className="nx-tickets__number">{ticket.number}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        sortable: true,
        render: (ticket) => <span className="nx-tickets__text">{ticket.customer}</span>,
      },
      {
        key: 'assignee',
        header: 'Assignee',
        sortable: true,
        render: (ticket) => (
          <span className="nx-tickets__text" data-unassigned={!ticket.assignee || undefined}>
            {ticket.assignee || 'Unassigned'}
          </span>
        ),
      },
      {
        key: 'priority',
        header: 'Priority',
        sortable: false,
        render: (ticket) => (
          <Badge tone={ticket.priority?.tone ?? 'neutral'}>{ticket.priority?.label ?? '—'}</Badge>
        ),
      },
      {
        key: 'sla',
        header: 'SLA',
        sortable: false,
        render: (ticket) => (
          <Badge tone={ticket.slaBreached ? 'danger' : 'success'}>
            {ticket.slaBreached ? 'Breached' : 'Met'}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: false,
        render: (ticket) => (
          <Badge tone={ticket.status?.tone ?? 'neutral'} dot>
            {ticket.status?.label ?? ticket.statusKey}
          </Badge>
        ),
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        render: (ticket) => (
          <span className="nx-tickets__date">{formatDate(ticket.updatedAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        sortable: false,
        render: (ticket) => {
          /* Resolved and closed tickets are terminal for this screen. */
          if (ticket.statusKey === 'CLOSED' || ticket.statusKey === 'RESOLVED') return null;
          return (
            <Button
              size="xs"
              variant="outline"
              leftIcon={<FiX size={12} />}
              loading={closing === ticket.id}
              onClick={() => handleClose(ticket)}
              aria-label={`Close ticket ${ticket.number}`}
            >
              Close
            </Button>
          );
        },
      },
    ],
    /* `handleClose` is a stable useCallback; `closing` drives which row
       spins. */
    [closing, handleClose],
  );

  const table = useDataTable({
    tableName: 'tickets',
    columns,
    initialPageSize: 15,
  });

  /* One full set — see the header note on why no server filter is used. */
  const { data, isLoading, isFetching, isError, error, refetch } = useGetTicketsQuery({
    pageSize: 200,
  });
  const {
    data: sla,
    isLoading: slaLoading,
    isError: slaError,
    refetch: refetchSla,
  } = useGetSlaMetricsQuery();

  const tickets = useMemo(() => data?.items ?? [], [data]);

  const rows = useMemo(() => {
    const needle = table.search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.statusKey === statusFilter;
      const matchesPriority =
        priorityFilter === 'all' || priorityKeyOf(ticket) === priorityFilter;
      const matchesSearch =
        !needle ||
        ticket.number?.toLowerCase().includes(needle) ||
        ticket.subject?.toLowerCase().includes(needle) ||
        ticket.customer?.toLowerCase().includes(needle) ||
        ticket.assignee?.toLowerCase().includes(needle);
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tickets, statusFilter, priorityFilter, table.search]);

  const isFiltered =
    Boolean(table.search.trim()) || statusFilter !== 'all' || priorityFilter !== 'all';

  /* The two selects live in local state (they are filters over the loaded
     set, not query params), so the toolbar's clear control counts and resets
     them alongside the hook's own filters. */
  const localFilterCount =
    (statusFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0) + table.activeFilterCount;

  const clearAllFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    table.clearFilters();
  };

  /* The hook only resets its page counter for its own search and filters;
     these two selects are local. Without the clamp, filtering from a deep
     page would slice an empty window and report "no tickets match". */
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / table.pageSize));
    if (table.page > totalPages) table.setPage(1);
  }, [rows.length, table.page, table.pageSize, table.setPage]);

  /* Open is counted from the full set; the rest come from the SLA endpoint,
     which reports no open/resolved-this-week figures — each tile's hint says
     which number it is and where it came from. */
  const kpis = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.statusKey === 'OPEN').length;
    const slaOk = Boolean(sla) && !slaError;
    const hint = (available, text) => (available ? text : 'Summary unavailable');

    return [
      {
        key: 'open',
        label: 'Open',
        value: String(open),
        icon: <FiInbox size={14} />,
        tone: open > 0 ? 'accent' : 'neutral',
        hint: 'Across all tickets',
      },
      {
        key: 'breached',
        label: 'Breaching',
        value: slaOk ? String(sla.breached) : '—',
        icon: <FiFlag size={14} />,
        tone: slaOk && sla.breached > 0 ? 'danger' : 'success',
        hint: hint(slaOk, 'From the SLA endpoint'),
      },
      {
        key: 'within-sla',
        label: 'Within SLA',
        value: slaOk ? formatPercent(sla.withinSla, 1, false) : '—',
        icon: <FiActivity size={14} />,
        tone: 'success',
        hint: hint(slaOk, 'Reported by the API'),
      },
      {
        key: 'first-response',
        label: 'First response',
        value: slaOk ? `${sla.avgFirstResponse}m` : '—',
        icon: <FiClock size={14} />,
        tone: 'violet',
        hint: hint(slaOk, 'Average minutes'),
      },
      {
        key: 'resolution',
        label: 'Resolution',
        value: slaOk ? `${sla.avgResolution}m` : '—',
        icon: <FiCheckCircle size={14} />,
        tone: 'accent',
        hint: hint(slaOk, 'Average minutes'),
      },
    ];
  }, [tickets, sla, slaError]);

  const handleRefresh = () => {
    refetch();
    refetchSla();
    notify.info('Refreshing tickets');
  };

  if (isError) {
    return (
      <div className="page nx-tickets">
        <Card padding="lg">
          <div className="nx-tickets__error">
            <h1 className="nx-tickets__error-title">Could not load tickets</h1>
            <p className="nx-tickets__error-text">
              {serverMessage(error, 'The support queue is unavailable right now.')}
            </p>
            <Button onClick={handleRefresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-tickets">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Support</span>
          <h1 className="page__title">Tickets</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading the queue…'
              : `${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'} in the queue`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh tickets"
          >
            Refresh
          </Button>
          <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />} onClick={() => dialog.show()}>
            New ticket
          </Button>
        </div>
      </div>

      <div className="page__body">
        <div className="grid grid--metrics">
          {kpis.map(({ key, ...kpi }) => (
            <MetricCard key={key} {...kpi} loading={isLoading || slaLoading} />
          ))}
        </div>

        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Number, subject, customer, assignee"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={handleRefresh}
            isFetching={isFetching}
            activeFilterCount={localFilterCount}
            onClearFilters={clearAllFilters}
          >
            <div className="nx-tickets__filters">
              <Input
                as="select"
                size="sm"
                fullWidth={false}
                label="Status"
                name="ticket-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={STATUS_OPTIONS}
                containerClassName="nx-tickets__filter-field"
              />
              <Input
                as="select"
                size="sm"
                fullWidth={false}
                label="Priority"
                name="ticket-priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                options={PRIORITY_OPTIONS}
                containerClassName="nx-tickets__filter-field"
              />
            </div>
          </TableToolbar>

          <DataTable
            columns={columns}
            data={rows}
            loading={isLoading}
            skeleton
            clientSide
            page={table.page}
            pageSize={table.pageSize}
            total={rows.length}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            sortBy={table.sortBy}
            sortOrder={table.sortOrder}
            onSort={table.toggleSort}
            visibleColumns={table.visibleColumns}
            isFiltered={isFiltered}
            itemLabel="tickets"
            emptyIcon={<FiInbox />}
            emptyTitle={isFiltered ? 'No tickets match' : 'No tickets yet'}
            emptyDescription={
              isFiltered
                ? 'Try a different filter or clear the search.'
                : 'Conversations started here will appear in the queue.'
            }
          />
        </Card>
      </div>
      <RecordFormModal
        open={dialog.open}
        onClose={dialog.hide}
        title="New ticket"
        subtitle="Log a customer request. It starts open and unassigned."
        submitLabel="Open ticket"
        isSaving={isCreating}
        fields={ticketFields}
        form={dialog.form}
        errors={dialog.errors}
        onChange={dialog.handleChange}
        onSubmit={dialog.submit}
      />
    </div>
  );
}
