/**
 * NexERP — TeamSettingsPage
 * ---------------------------------------------------------------------------
 * The workspace roster (route suffix `settings/team`): who can sign in, what
 * they do and which department they sit in, with server-driven search, sort
 * and pagination through useDataTable + useGetEmployeesQuery.
 *
 * The "Invite member" dialog validates an email and role, then closes with a
 * success toast — and the toast tells the truth: there is no invite mutation
 * in the API (no POST /settings/invites exists in the mock or the contract),
 * so nothing is faked. A silent fake POST is how demo code becomes a bug in
 * production; this one files the intent and says so.
 *
 * "Last active" renders an em dash when the record carries no activity
 * timestamp, because the employee fixture does not have one yet. Inventing a
 * time from the join date would be a plausible-looking lie in a column whose
 * entire job is being accurate.
 */

import { useMemo, useState } from 'react';
import { FiMail, FiPlus, FiUserPlus, FiUsers } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import { useGetEmployeesQuery } from '@/features/hr/api/hrApi';
import useDataTable from '@/hooks/useDataTable';
import { useNotify } from '@/hooks/useNotification';
import { email as emailRule, required, validateForm } from '@/utils/validators';
import { fromNow } from '@/utils/date';
import './TeamSettingsPage.css';

const INVITE_INITIAL = { email: '', role: 'Member' };

const INVITE_SCHEMA = {
  email: [required, emailRule],
  role: [required],
};

const INVITE_ROLES = [
  { value: 'Administrator', label: 'Administrator — can change every setting' },
  { value: 'Manager', label: 'Manager — runs reports and approves work' },
  { value: 'Member', label: 'Member — day-to-day access only' },
];

/** First letters of the first two words: "Adaeze Okonkwo" -> "AO". */
function initialsFor(name = '') {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

export default function TeamSettingsPage() {
  const notify = useNotify();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState(INVITE_INITIAL);
  const [inviteErrors, setInviteErrors] = useState({});
  const [inviteTouched, setInviteTouched] = useState({});

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Member',
        sortable: true,
        render: (member) => (
          <div className="nx-set-team__member">
            <span className="nx-set-team__avatar" aria-hidden="true">
              {initialsFor(member.name)}
            </span>
            <div className="nx-set-team__ident">
              <strong className="nx-set-team__name">{member.name}</strong>
              <span className="nx-set-team__meta">{member.employeeNo}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        render: (member) => <span className="nx-set-team__email">{member.email}</span>,
      },
      { key: 'role', header: 'Role', sortable: true },
      { key: 'department', header: 'Department', sortable: true },
      {
        key: 'status',
        header: 'Status',
        /* Sorting the status *object* would sort "[object Object]" — only the
           statusKey field is orderable, and the column does not carry it. */
        sortable: false,
        render: (member) => (
          <Badge tone={member.status?.tone ?? 'neutral'} dot>
            {member.status?.label ?? member.statusKey}
          </Badge>
        ),
      },
      {
        key: 'lastActive',
        header: 'Last active',
        align: 'right',
        /* Not sortable: there is no timestamp field on the record to sort by
           (see the file header). */
        sortable: false,
        render: (member) => {
          const lastActive = member.lastActiveAt ?? member.lastLoginAt ?? null;
          return lastActive ? (
            <span className="nx-set-team__active">{fromNow(lastActive)}</span>
          ) : (
            <span
              className="nx-set-team__active nx-set-team__active--none"
              title="No activity timestamp in the demo data"
            >
              —
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useDataTable({
    tableName: 'team',
    columns,
    initialPageSize: 10,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetEmployeesQuery(
    table.queryParams,
  );

  const inviteErrorFor = (field) => (inviteTouched[field] ? inviteErrors[field] : '');

  const setInviteField = (field) => (event) => {
    const { value } = event.target;
    setInvite((prev) => ({ ...prev, [field]: value }));
    if (inviteTouched[field]) {
      const { errors: nextErrors } = validateForm({ ...invite, [field]: value }, INVITE_SCHEMA);
      setInviteErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
    }
  };

  const blurInviteField = (field) => () => {
    setInviteTouched((prev) => ({ ...prev, [field]: true }));
    const { errors: nextErrors } = validateForm(invite, INVITE_SCHEMA);
    setInviteErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
  };

  const openInvite = () => {
    setInvite(INVITE_INITIAL);
    setInviteErrors({});
    setInviteTouched({});
    setInviteOpen(true);
  };

  const closeInvite = () => setInviteOpen(false);

  const submitInvite = (event) => {
    event.preventDefault();
    setInviteTouched({ email: true, role: true });
    const { valid, errors: nextErrors } = validateForm(invite, INVITE_SCHEMA);
    setInviteErrors(nextErrors);
    if (!valid) return;

    /* No mutation exists, so this is an intent, not a send — and the toast
       says so instead of pretending an email left the building. */
    notify.success(
      `Invitation prepared for ${invite.email.trim()} — the demo has no mail service, so nothing was dispatched.`,
    );
    setInviteOpen(false);
  };

  const total = data?.total;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Workspace</span>
          <h1 className="page__title">Team</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading the roster…'
              : `${total ?? data?.items?.length ?? 0} people with access to this workspace`}
          </p>
        </div>
        <div className="page__actions">
          <Button variant="primary" size="sm" leftIcon={<FiUserPlus size={15} />} onClick={openInvite}>
            Invite member
          </Button>
        </div>
      </div>

      <div className="page__body">
        <Card padding="none">
          <TableToolbar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Name, email or department"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          />

          <DataTable
            columns={columns}
            data={data?.items ?? []}
            loading={isLoading}
            skeleton
            error={isError ? (error?.data?.message ?? 'Could not load the team roster.') : null}
            onRetry={isError ? refetch : null}
            page={table.page}
            pageSize={table.pageSize}
            total={total}
            totalPages={data?.totalPages}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            sortBy={table.sortBy}
            sortOrder={table.sortOrder}
            onSort={table.toggleSort}
            visibleColumns={table.visibleColumns}
            isFiltered={table.isFiltered}
            itemLabel="team members"
            caption="Workspace team roster"
            emptyIcon={<FiUsers />}
            emptyTitle="No team members yet"
            emptyDescription="Invite the first person and they will appear here once they accept."
            emptyAction={
              <Button variant="primary" size="sm" leftIcon={<FiPlus size={15} />} onClick={openInvite}>
                Invite member
              </Button>
            }
          />
        </Card>
      </div>

      <Modal
        open={inviteOpen}
        onClose={closeInvite}
        title="Invite a team member"
        subtitle="They get a role today and can set a password once a mail service is connected."
        footer={
          <>
            <Button variant="ghost" onClick={closeInvite}>
              Cancel
            </Button>
            <Button type="submit" form="nx-set-team-invite-form" variant="primary">
              Invite member
            </Button>
          </>
        }
      >
        {/* The submit button lives in the modal footer, outside this form —
            the `form` attribute ties it back so Enter still submits. */}
        <form
          id="nx-set-team-invite-form"
          className="nx-set-team__invite stack"
          onSubmit={submitInvite}
          noValidate
        >
          <Input
            label="Work email"
            name="inviteEmail"
            type="email"
            autoComplete="email"
            placeholder="adaeze@company.com"
            leftIcon={<FiMail size={15} />}
            value={invite.email}
            onChange={setInviteField('email')}
            onBlur={blurInviteField('email')}
            error={inviteErrorFor('email')}
            required
          />

          <Input
            label="Role"
            name="inviteRole"
            as="select"
            options={INVITE_ROLES}
            value={invite.role}
            onChange={setInviteField('role')}
            onBlur={blurInviteField('role')}
            error={inviteErrorFor('role')}
            hint="Roles are least-privilege: grant more only when the work needs it."
            required
          />
        </form>
      </Modal>
    </div>
  );
}
