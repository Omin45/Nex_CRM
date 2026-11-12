/**
 * ArkCRM — SuperAdminDashboardPage
 * ---------------------------------------------------------------------------
 * Landing screen for the platform administration surface. It answers the four
 * questions an operator opens the console to answer: how many tenants exist,
 * how many are healthy, how much recurring revenue they produce, and who is
 * stuck in onboarding.
 *
 * Scoping note: this is deliberately *not* a vendor dashboard. It reads the
 * platform stats and the vendor directory, never tenant revenue, invoices or
 * inventory — a super admin has no business inside a customer's books, and
 * keeping the two apart in the data layer makes that impossible to get wrong.
 *
 * Data: GET /vendors/stats and GET /vendors.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight, FiBriefcase, FiCheckCircle, FiClock, FiDollarSign, FiPauseCircle, FiSearch,
} from 'react-icons/fi';
import Card, { CardBody, CardFooter, CardHeader } from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import DataTable from '@/components/data-display/DataTable/DataTable';
import LoadingState from '@/components/feedback/LoadingState';
import EmptyState from '@/components/feedback/EmptyState';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetStatsQuery, useGetVendorsQuery } from '@/features/super-admin/api/superAdminApi';
import { useCurrentUser } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { appRoutes } from '@/config/navigation.config';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'SUSPENDED', label: 'Suspended' },
];

export default function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch } = useGetStatsQuery();
  const { data: vendors, isLoading: vendorsLoading } = useGetVendorsQuery({ page: 1, pageSize: 50 });

  const vendorRows = useMemo(() => vendors?.items ?? [], [vendors]);

  /* Client-side narrowing keeps the directory responsive. The list endpoint
     already accepts `search` and `status`, so moving this server-side later is
     a one-line change with identical call sites. */
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const wanted = STATUS_FILTERS.find((f) => f.id === status);

    return vendorRows.filter((vendor) => {
      const matchesStatus =
        status === 'all' || vendor.statusKey === status || vendor.status?.label === wanted?.label;
      const matchesSearch =
        !needle ||
        vendor.name?.toLowerCase().includes(needle) ||
        vendor.email?.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [vendorRows, search, status]);

  /* Oldest application first: the queue is a triage list, not a feed. */
  const onboardings = useMemo(
    () =>
      vendorRows
        .filter((vendor) => vendor.status?.label === 'Pending review')
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
        .slice(0, 6),
    [vendorRows],
  );

  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Vendor',
        render: (vendor) => (
          <div className="flex items-center gap-2 min-w-0">
            <span className="brand__mark" aria-hidden="true">
              {vendor.name?.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <strong className="truncate">{vendor.name}</strong>
              <div className="text-xs text-muted truncate">
                {vendor.city} · {vendor.plan}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'contactName',
        header: 'Contact',
        render: (vendor) => (
          <div className="min-w-0">
            <div className="truncate">{vendor.contactName}</div>
            <div className="text-xs text-muted truncate">{vendor.email}</div>
          </div>
        ),
      },
      {
        key: 'employees',
        header: 'Seats',
        align: 'right',
        render: (vendor) => <span className="numeric">{vendor.employees}</span>,
      },
      {
        key: 'mrr',
        header: 'MRR',
        align: 'right',
        render: (vendor) => (
          <span className="numeric">{formatCurrency(vendor.mrr, 'USD', { compact: true })}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (vendor) => <Badge tone={vendor.status?.tone}>{vendor.status?.label}</Badge>,
      },
      {
        key: 'lastActiveAt',
        header: 'Last active',
        align: 'right',
        render: (vendor) => <span className="text-sm text-muted">{formatDate(vendor.lastActiveAt)}</span>,
      },
    ],
    [],
  );

  if (statsError) {
    return (
      <div className="page page--narrow">
        <EmptyState
          icon={<FiBriefcase />}
          title="Platform statistics unavailable"
          description="The stats endpoint did not respond. Check the API connection and try again."
          action={<Button onClick={refetch}>Retry</Button>}
        />
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total vendors',
      value: stats?.total,
      icon: <FiBriefcase size={14} />,
      tone: 'accent',
      hint: `${stats?.active ?? 0} active`,
    },
    {
      label: 'Pending review',
      value: stats?.pending,
      icon: <FiClock size={14} />,
      tone: 'warning',
      hint: 'Awaiting onboarding sign-off',
    },
    {
      label: 'Suspended',
      value: stats?.suspended,
      icon: <FiPauseCircle size={14} />,
      tone: 'danger',
      hint: 'Access revoked',
    },
    {
      label: 'Platform MRR',
      value: stats?.mrr != null ? formatCurrency(stats.mrr, 'USD', { compact: true }) : null,
      icon: <FiDollarSign size={14} />,
      tone: 'success',
      hint: 'Sum of tenant subscriptions',
    },
  ];

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="page__eyebrow">Platform</p>
          <h1 className="page__title">Good day, {firstName}</h1>
          <p className="page__subtitle">
            Every tenant on ArkCRM, and the recurring revenue they generate.
          </p>
        </div>
        <div className="page__actions">
          <Button variant="outline" onClick={() => navigate(appRoutes.admin.vendors)}>
            All vendors
            <FiArrowRight />
          </Button>
        </div>
      </header>

      <section className="grid grid--metrics" aria-label="Platform key figures">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.label} {...kpi} loading={statsLoading} />
        ))}
      </section>

      <div className="grid grid--split">
        <Card>
          <CardHeader
            title="Vendor directory"
            subtitle={`${rows.length} of ${vendorRows.length} tenants`}
          />
          <CardBody>
            <div className="toolbar">
              <div className="toolbar__group">
                <div className="nx-segmented" role="group" aria-label="Filter by status">
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
              </div>

              <div className="toolbar__spacer" />

              <div className="toolbar__group" style={{ minWidth: '15rem' }}>
                <Input
                  fullWidth={false}
                  type="search"
                  leftIcon={<FiSearch size={14} />}
                  placeholder="Search vendors"
                  aria-label="Search vendors"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <DataTable
              columns={columns}
              data={rows}
              loading={vendorsLoading}
              skeleton
              pageSize={rows.length || 1}
              total={rows.length}
              onRowClick={() => navigate(appRoutes.admin.vendors)}
              emptyIcon={<FiBriefcase />}
              emptyTitle="No vendors match"
              emptyDescription="Adjust the status filter or clear the search."
            />
          </CardBody>
          <CardFooter>
            <Button variant="subtle" onClick={() => navigate(appRoutes.admin.vendors)}>
              View full directory
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader
            title="Onboarding queue"
            subtitle="Oldest applications first"
            action={
              onboardings.length > 0 ? (
                <span className="chip">
                  {onboardings.length} waiting
                </span>
              ) : null
            }
          />
          <CardBody>
            {vendorsLoading ? (
              <LoadingState label="Loading queue…" />
            ) : onboardings.length === 0 ? (
              <EmptyState
                icon={<FiCheckCircle />}
                title="Queue is clear"
                description="Every application has been reviewed."
              />
            ) : (
              <ul className="stack stack--sm">
                {onboardings.map((vendor) => (
                  <li key={vendor.id} className="row row--between items-center gap-3">
                    <div className="min-w-0">
                      <strong className="truncate">{vendor.name}</strong>
                      <div className="text-xs text-muted">
                        Applied {formatDate(vendor.createdAt)} · step {vendor.onboardingStep} of 5
                      </div>
                    </div>
                    <Badge tone={vendor.status?.tone}>{vendor.status?.label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
