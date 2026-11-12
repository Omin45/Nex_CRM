/**
 * ArkCRM — PlatformUsersPage
 * ---------------------------------------------------------------------------
 * Every account that can sign in anywhere on ArkCRM, with the tenant it
 * belongs to. Search, sort and paging run through the server
 * (GET /platform/users); the role segments stay local, because there are
 * eight roles in the vocabulary and a segmented control only has four slots —
 * so the six operational roles share a single "Staff" segment rather than
 * turning the toolbar into a dropdown.
 *
 * MFA is shown as icon *and* words. A green shield alone tells a colourblind
 * operator nothing about whether an account is protected, and this is the
 * screen they open to find exactly that.
 *
 * Data: GET /platform/users.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheckCircle, FiRefreshCw, FiShield, FiUser, FiUserPlus, FiUsers,
} from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetPlatformUsersQuery } from '../api/superAdminApi';
import { useNotify } from '@/hooks/useNotification';
import useDataTable from '@/hooks/useDataTable';
import { formatDate, fromNow } from '@/utils/date';
import { appRoutes } from '@/config/navigation.config';
import './PlatformUsersPage.css';
import { serverMessage } from '@/utils/errorMessage';

const ROLE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'owner', label: 'Owners' },
  { id: 'admin', label: 'Admins' },
  { id: 'staff', label: 'Staff' },
];

/* Display names for the eight roles the fixture picks from. Unknown roles
   fall back to the raw key so nothing ever renders blank. */
const ROLES = {
  VENDOR_OWNER: { label: 'Owner', tone: 'violet' },
  VENDOR_ADMIN: { label: 'Administrator', tone: 'accent' },
  ACCOUNTANT: { label: 'Accountant', tone: 'neutral' },
  SALES_MANAGER: { label: 'Sales manager', tone: 'info' },
  SALES_REP: { label: 'Sales rep', tone: 'neutral' },
  SUPPORT_AGENT: { label: 'Support agent', tone: 'neutral' },
  HR_MANAGER: { label: 'HR manager', tone: 'info' },
  WAREHOUSE_MANAGER: { label: 'Warehouse manager', tone: 'neutral' },
};

const matchesRole = (role, group) => {
  if (group === 'all') return true;
  if (group === 'owner') return role === 'VENDOR_OWNER';
  if (group === 'admin') return role === 'VENDOR_ADMIN';
  return role !== 'VENDOR_OWNER' && role !== 'VENDOR_ADMIN';
};

export default function PlatformUsersPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const [roleGroup, setRoleGroup] = useState('all');

  const columns = useMemo(
    () => [
      {
        key: 'fullName',
        header: 'User',
        render: (user) => (
          <div className="nx-pusers__cell">
            <span className="nx-pusers__mark" aria-hidden="true">
              {user.firstName?.slice(0, 1)}{user.lastName?.slice(0, 1)}
            </span>
            <div className="nx-pusers__ident">
              <strong className="nx-pusers__name">{user.fullName}</strong>
              <span className="nx-pusers__meta">{user.email}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (user) => (
          <Badge tone={ROLES[user.role]?.tone ?? 'neutral'}>
            {ROLES[user.role]?.label ?? user.role}
          </Badge>
        ),
      },
      {
        key: 'tenant',
        header: 'Tenant',
        render: (user) => (
          <div className="nx-pusers__ident">
            <span className="nx-pusers__tenant">{user.tenant}</span>
            <span className="nx-pusers__meta mono">{user.tenantId}</span>
          </div>
        ),
      },
      {
        key: 'mfaEnabled',
        header: 'MFA',
        sortable: true,
        render: (user) => (
          <span
            className="nx-pusers__mfa"
            data-on={user.mfaEnabled ? 'true' : undefined}
          >
            <FiShield size={13} aria-hidden="true" />
            {user.mfaEnabled ? 'Enabled' : 'Not set up'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (user) => (
          <Badge tone={user.status?.tone ?? 'neutral'} dot>
            {user.status?.label ?? user.statusKey}
          </Badge>
        ),
      },
      {
        key: 'lastActiveAt',
        header: 'Last active',
        align: 'right',
        sortable: true,
        render: (user) => (
          <div className="nx-pusers__when">
            <span>{fromNow(user.lastActiveAt)}</span>
            <span className="nx-pusers__meta">{formatDate(user.createdAt)}</span>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useDataTable({
    tableName: 'platform-users',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetPlatformUsersQuery(table.queryParams);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((user) => matchesRole(user.role, roleGroup));
  }, [data, roleGroup]);

  const kpis = useMemo(() => {
    const active = rows.filter((user) => user.statusKey === 'ACTIVE').length;
    const invited = rows.filter((user) => user.statusKey === 'INVITED').length;
    const withMfa = rows.filter((user) => user.mfaEnabled).length;
    const mfaShare = rows.length ? Math.round((withMfa / rows.length) * 100) : 0;

    return [
      {
        key: 'users',
        label: 'Accounts',
        value: data?.total ?? rows.length,
        icon: <FiUsers size={14} />,
        tone: 'accent',
        hint: 'Everyone who can sign in',
      },
      {
        key: 'active',
        label: 'Active',
        value: active,
        icon: <FiCheckCircle size={14} />,
        tone: 'success',
        hint: 'On this page of accounts',
      },
      {
        key: 'invited',
        label: 'Invited',
        value: invited,
        icon: <FiUserPlus size={14} />,
        tone: 'warning',
        hint: 'Has not signed in yet',
      },
      {
        key: 'mfa',
        label: 'MFA enabled',
        value: withMfa,
        icon: <FiShield size={14} />,
        tone: 'violet',
        hint: `${mfaShare}% of the accounts shown`,
      },
    ];
  }, [rows, data]);

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing platform accounts');
  };

  if (isError && !data) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <span className="page__eyebrow">Platform</span>
            <h1 className="page__title">Users</h1>
            <p className="page__subtitle">The account directory is unavailable right now.</p>
          </div>
        </div>
        <Card padding="lg">
          <div className="nx-pusers__error">
            <h2 className="nx-pusers__error-title">Could not load accounts</h2>
            <p className="nx-pusers__error-text">
              {serverMessage(error, 'The platform users endpoint did not respond. Try again in a moment.')}
            </p>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Platform</span>
          <h1 className="page__title">Users</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading accounts…'
              : `${data?.total ?? rows.length} ${(data?.total ?? rows.length) === 1 ? 'account' : 'accounts'} across every tenant`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh accounts"
          >
            Refresh
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
            searchPlaceholder="Name, email or tenant"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by role group">
              {ROLE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`nx-segmented__item${roleGroup === filter.id ? ' is-active' : ''}`}
                  aria-pressed={roleGroup === filter.id}
                  onClick={() => setRoleGroup(filter.id)}
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
            itemLabel="accounts"
            isFiltered={table.isFiltered}
            onRowClick={(user) => navigate(appRoutes.admin.vendorDetail(user.tenantId))}
            emptyIcon={<FiUser />}
            emptyTitle={roleGroup === 'all' ? 'No accounts yet' : 'No accounts in this group'}
            emptyDescription="Accounts appear here as soon as they are invited to a tenant."
          />
        </Card>
      </div>
    </div>
  );
}
