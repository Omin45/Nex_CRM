/**
 * ArkCRM — TeamSettingsPage
 * ---------------------------------------------------------------------------
 * The workspace roster (route suffix `settings/team`): who can sign in, what
 * they do and which department they sit in, with server-driven search, sort
 * and pagination through useDataTable + useGetEmployeesQuery.
 *
 * The page answers one question — "how do I get somebody onto my team?" — in
 * two parts, because there are two ways in:
 *
 *   1. The **workspace code**. The open door. Anybody with it can sign
 *      themselves up and pick a role. The owner copies the code and shares
 *      it; the code is the only secret, and the workspace name is not.
 *   2. An **invitation**. The named door. One person, one address, one role,
 *      and a link only that person can use.
 *
 * There is no mail service, so an invitation is a link rather than an email:
 * the owner copies it and sends it themselves. The page says so rather than
 * pretending a message left the building.
 *
 * "Last active" renders an em dash when the record carries no activity
 * timestamp, because the employee fixture does not have one yet. Inventing a
 * time from the join date would be a plausible-looking lie in a column whose
 * entire job is being accurate.
 */

import { useMemo, useState } from 'react';
import { FiCheck, FiCopy, FiMail, FiTrash2, FiUserPlus, FiUsers } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import { useGetEmployeesQuery } from '@/features/hr/api/hrApi';
import {
  useCreateInviteMutation,
  useGetInvitesQuery,
  useGetMembersQuery,
  useGetMyTenantQuery,
  useRemoveMemberMutation,
  useRevokeInviteMutation,
  useUpdateMemberMutation,
} from '@/features/tenants/api/tenantsApi';
import { ROLE_LABELS } from '@/config/permissions.config';
import useDataTable from '@/hooks/useDataTable';
import { useNotify } from '@/hooks/useNotification';
import { email as emailRule, required, validateForm } from '@/utils/validators';
import { fromNow } from '@/utils/date';
import './TeamSettingsPage.css';
import { serverMessage } from '@/utils/errorMessage';

const INVITE_INITIAL = { email: '', role: 'MANAGER' };

const INVITE_SCHEMA = {
  email: [required, emailRule],
  role: [required],
};

/**
 * The roles an invitation may grant.
 *
 * <p>The same seven the join form offers. The administrator roles are the
 * owner's to hand out — never a link's — and the customer role is a portal
 * login for a customer of the business rather than a member of its staff.
 */
const INVITE_ROLES = [
  { value: 'MANAGER', label: 'Manager — runs reports and approves work' },
  { value: 'SALES_MANAGER', label: 'Sales Manager — owns the pipeline' },
  { value: 'SALES_AGENT', label: 'Sales Agent — works the pipeline' },
  { value: 'ACCOUNTANT', label: 'Accountant — keeps the books' },
  { value: 'FINANCE_MANAGER', label: 'Finance Manager — owns the ledger' },
  { value: 'SUPPORT_MANAGER', label: 'Support Manager — owns the support queue' },
  { value: 'SUPPORT_AGENT', label: 'Support Agent — works the support queue' },
];

/**
 * The roles an existing member can be moved to.
 *
 * <p>Administrator joins the list here because this is the owner handing a
 * role to somebody who has already arrived: the owner is the one who may
 * give it, so it is theirs to give. The platform administrator is not on the
 * list — that role belongs to the platform, not to a business.
 */
const MEMBER_ROLES = [
  { value: 'ADMIN', label: 'Administrator' },
  ...INVITE_ROLES,
];

/** First letters of the first two words: "Adaeze Okonkwo" -> "AO". */
function initialsFor(name = '') {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

/** The link an invitation is opened with. */
function inviteLink(token) {
  if (typeof window === 'undefined') return `/invite/${token}`;
  return `${window.origin}/invite/${token}`;
}

export default function TeamSettingsPage() {
  const notify = useNotify();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState(INVITE_INITIAL);
  const [inviteErrors, setInviteErrors] = useState({});
  const [inviteTouched, setInviteTouched] = useState({});
  /* The invitation that was just sent, so its link can be copied. */
  const [sent, setSent] = useState(null);
  const [copied, setCopied] = useState('');

  const { data: tenant } = useGetMyTenantQuery();
  const { data: invitations, isFetching: isLoadingInvitations } = useGetInvitesQuery();
  const { data: members, isFetching: isLoadingMembers } = useGetMembersQuery();
  const [createInvite, { isLoading: isInviting }] = useCreateInviteMutation();
  const [revokeInvite, { isLoading: isRevoking }] = useRevokeInviteMutation();
  const [updateMember, { isLoading: isUpdatingMember }] = useUpdateMemberMutation();
  const [removeMember, { isLoading: isRemovingMember }] = useRemoveMemberMutation();

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
    setSent(null);
    setInviteOpen(true);
  };

  const closeInvite = () => setInviteOpen(false);

  /** Copies something and says so for a moment. */
  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      notify.error('Could not reach the clipboard. Select the text and copy it yourself.');
    }
  };

  const submitInvite = async (event) => {
    event.preventDefault();
    setInviteTouched({ email: true, role: true });
    const { valid, errors: nextErrors } = validateForm(invite, INVITE_SCHEMA);
    setInviteErrors(nextErrors);
    if (!valid) return;

    try {
      const created = await createInvite({
        email: invite.email.trim(),
        role: invite.role,
      }).unwrap();

      setSent(created);
      setInvite(INVITE_INITIAL);
      setInviteErrors({});
      setInviteTouched({});
      notify.success(`Invitation ready for ${created.email}`);
    } catch (err) {
      notify.error(serverMessage(err, 'Could not send that invitation.'));
    }
  };

  const withdraw = async (record) => {
    try {
      await revokeInvite(record.id).unwrap();
      notify.success(`Invitation for ${record.email} withdrawn`);
    } catch (err) {
      notify.error(serverMessage(err, 'Could not withdraw that invitation.'));
    }
  };

  /**
   * Moves somebody to a different role.
   *
   * <p>The server wants the whole record, not just the role, so the name and
   * phone travel with it rather than being wiped.
   */
  const changeRole = async (member, role) => {
    if (!role || role === member.role) return;

    try {
      await updateMember({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone ?? '',
        role,
        enabled: member.enabled,
      }).unwrap();
      notify.success(`${member.fullName ?? member.email} is now ${ROLE_LABELS[role] ?? role}`);
    } catch (err) {
      notify.error(serverMessage(err, 'Could not change that role.'));
    }
  };

  /** Takes somebody out of the workspace. */
  const remove = async (member) => {
    const confirmed = window.confirm(
      `Remove ${member.fullName ?? member.email} from this workspace?\n\nThey will no longer be able to sign in to it.`,
    );
    if (!confirmed) return;

    try {
      await removeMember(member.id).unwrap();
      notify.success(`${member.fullName ?? member.email} removed from this workspace`);
    } catch (err) {
      notify.error(serverMessage(err, 'Could not remove that person.'));
    }
  };

  /** The roles a member can be moved to, including one they already hold. */
  const roleOptionsFor = (member) => {
    const options = [...MEMBER_ROLES];
    if (!options.some((option) => option.value === member.role)) {
      options.push({ value: member.role, label: ROLE_LABELS[member.role] ?? member.role });
    }
    return options;
  };

  const total = data?.total;

  const pending = (invitations ?? []).filter((record) => record.status === 'PENDING');
  const settled = (invitations ?? []).filter((record) => record.status !== 'PENDING');

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
        {/* ---- the two ways in ---- */}
        <Card padding="md" className="nx-set-team__ways">
          <div className="nx-set-team__ways-head">
            <h2 className="nx-set-team__ways-title">Bring people in</h2>
            <p className="nx-set-team__ways-sub">
              There is no mail service here, so an invitation is a link you copy and send
              yourself. It opens the account for that one address, under that one role.
            </p>
          </div>

          <div className="nx-set-team__ways-grid">
            {/* The open door. */}
            <div className="nx-set-team__way">
              <span className="nx-set-team__way-label">Workspace code</span>
              <p className="nx-set-team__way-note">
                Share this and anybody can sign up and pick their own role.
              </p>
              <div className="nx-set-team__code">
                <code>{tenant?.code ?? '—'}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={copied === 'code' ? <FiCheck size={14} /> : <FiCopy size={14} />}
                  disabled={!tenant?.code}
                  onClick={() => copy(tenant?.code ?? '', 'code')}
                >
                  {copied === 'code' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* The named door. */}
            <div className="nx-set-team__way">
              <span className="nx-set-team__way-label">One person, one role</span>
              <p className="nx-set-team__way-note">
                An invitation is good for one address only, and sets the role for them.
              </p>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<FiUserPlus size={14} />}
                onClick={openInvite}
              >
                Invite someone
              </Button>
            </div>
          </div>
        </Card>

        {/* ---- the link that was just sent ---- */}
        {sent ? (
          <Card padding="md" className="nx-set-team__sent" tone="success">
            <span className="nx-set-team__way-label">Invitation for {sent.email}</span>
            <p className="nx-set-team__way-note">
              Send this link to them. It expires on {new Date(sent.expiresAt).toLocaleDateString()}.
            </p>
            <div className="nx-set-team__code">
              <code>{inviteLink(sent.token)}</code>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={copied === 'link' ? <FiCheck size={14} /> : <FiCopy size={14} />}
                onClick={() => copy(inviteLink(sent.token), 'link')}
              >
                {copied === 'link' ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </Card>
        ) : null}

        {/* ---- the people who can sign in ---- */}
        <Card padding="none" className="nx-set-team__members">
          <div className="nx-set-team__invites-head">
            <h2 className="nx-set-team__ways-title">Members</h2>
            <span className="nx-set-team__ways-note">
              {isLoadingMembers
                ? 'Loading…'
                : `${members?.total ?? members?.items?.length ?? 0} can sign in to this workspace`}
            </span>
          </div>

          {members?.items?.length ? (
            <ul className="nx-set-team__invite-list">
              {members.items.map((member) => (
                <li key={member.id} className="nx-set-team__invite-row">
                  <span className="nx-set-team__avatar" aria-hidden="true">
                    {initialsFor(member.fullName ?? member.email)}
                  </span>
                  <div className="nx-set-team__ident">
                    <strong className="nx-set-team__name">{member.fullName ?? member.email}</strong>
                    <span className="nx-set-team__meta">{member.email}</span>
                  </div>

                  <select
                    className="nx-set-team__role-select"
                    value={member.role}
                    disabled={isUpdatingMember}
                    aria-label={`Role for ${member.fullName ?? member.email}`}
                    onChange={(event) => changeRole(member, event.target.value)}
                  >
                    {roleOptionsFor(member).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <span className="nx-set-team__invite-meta">
                    {member.lastLoginAt
                      ? `Last seen ${fromNow(member.lastLoginAt)}`
                      : 'Has not signed in yet'}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FiTrash2 size={14} />}
                    loading={isRemovingMember}
                    onClick={() => remove(member)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="nx-set-team__invite-empty">
              Nobody has signed in to this workspace yet. Share the code above, or invite
              somebody by name.
            </p>
          )}
        </Card>

        {/* ---- the invitations ---- */}
        <Card padding="none" className="nx-set-team__invites">
          <div className="nx-set-team__invites-head">
            <h2 className="nx-set-team__ways-title">Invitations</h2>
            <span className="nx-set-team__ways-note">
              {isLoadingInvitations
                ? 'Loading…'
                : `${pending.length} pending${settled.length ? `, ${settled.length} closed` : ''}`}
            </span>
          </div>

          {invitations?.length ? (
            <ul className="nx-set-team__invite-list">
              {invitations.map((record) => (
                <li key={record.id} className="nx-set-team__invite-row">
                  <span className="nx-set-team__invite-mail">{record.email}</span>
                  <Badge tone="neutral">{ROLE_LABELS[record.role] ?? record.role}</Badge>
                  <span className="nx-set-team__invite-meta">
                    {record.status === 'PENDING'
                      ? `Invited by ${record.invitedByName ?? 'the owner'}${
                          record.expiresAt
                            ? ` · expires ${new Date(record.expiresAt).toLocaleDateString()}`
                            : ''
                        }`
                      : record.status.toLowerCase()}
                  </span>
                  {record.status === 'PENDING' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<FiTrash2 size={14} />}
                      loading={isRevoking}
                      onClick={() => withdraw(record)}
                    >
                      Withdraw
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="nx-set-team__invite-empty">
              No invitations yet. Share the workspace code, or invite somebody by name.
            </p>
          )}
        </Card>

        {/* ---- the roster ---- */}
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
            error={isError ? (serverMessage(error, 'Could not load the team roster.')) : null}
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
              <Button variant="primary" size="sm" leftIcon={<FiUserPlus size={15} />} onClick={openInvite}>
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
        subtitle="They get this role, and a link that only their address can use."
        footer={
          <>
            <Button variant="ghost" onClick={closeInvite}>
              {sent ? 'Done' : 'Cancel'}
            </Button>
            {!sent ? (
              <Button type="submit" form="nx-set-team-invite-form" variant="primary" loading={isInviting}>
                Create invitation
              </Button>
            ) : null}
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
          {sent ? (
            <>
              <div className="nx-alert nx-alert--success" role="status">
                <span className="nx-alert__icon" aria-hidden="true">
                  <FiCheck size={16} />
                </span>
                Copy the link below and send it to {sent.email}.
              </div>
              <div className="nx-set-team__code">
                <code>{inviteLink(sent.token)}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={copied === 'link' ? <FiCheck size={14} /> : <FiCopy size={14} />}
                  onClick={() => copy(inviteLink(sent.token), 'link')}
                >
                  {copied === 'link' ? 'Copied' : 'Copy link'}
                </Button>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
