/**
 * NexERP — ProjectListPage
 * ---------------------------------------------------------------------------
 * The delivery portfolio: the numbers a delivery lead scans before opening
 * anything, with the table behind them.
 *
 * Status filtering is server-side — rows carry a scalar `statusKey` beside
 * the display `status` object, so the mock's exact-match filter narrows the
 * set and the pagination total stays honest. The KPI row describes the page
 * on screen rather than the whole portfolio, and every hint says so: a page
 * total and a portfolio total are different promises.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiCreditCard, FiFolder, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import MetricCard from '@/features/dashboard/components/MetricCard';
import { useGetProjectsQuery } from '../api/projectsApi';
import { useNotify } from '@/hooks/useNotification';
import useVendorPath from '@/hooks/useVendorPath';
import { appRoutes } from '@/config/navigation.config';
import useDataTable from '@/hooks/useDataTable';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import { formatDate, isOverdue } from '@/utils/date';
import './ProjectListPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'PLANNING', label: 'Planning' },
  { id: 'ON_HOLD', label: 'On hold' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function ProjectListPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const vendorPath = useVendorPath();
  const { currency } = useTenant();

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Project',
        render: (project) => (
          <div className="nx-proj-list__cell">
            <span className="nx-proj-list__mark" aria-hidden="true">
              <FiFolder size={14} />
            </span>
            <div className="nx-proj-list__ident">
              <strong className="nx-proj-list__name">{project.name}</strong>
              <span className="nx-proj-list__meta">{project.code}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        sortable: true,
        render: (project) => <span className="nx-proj-list__customer">{project.customer}</span>,
      },
      {
        key: 'manager',
        header: 'Manager',
        sortable: true,
        render: (project) => <span className="nx-proj-list__manager">{project.manager}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: false,
        render: (project) => (
          <Badge tone={project.status?.tone ?? 'neutral'} dot>
            {project.status?.label ?? project.statusKey}
          </Badge>
        ),
      },
      {
        key: 'progress',
        header: 'Progress',
        align: 'right',
        sortable: true,
        render: (project) => {
          const value = project.progress ?? 0;
          return (
            <div className="nx-proj-list__progress">
              {/* A native <progress> carries the value for assistive tech and
                  takes its width from the attribute, so no measurement ever
                  has to be written as an inline style. */}
              <progress
                className="nx-proj-list__bar"
                value={value}
                max={100}
                aria-label={`${project.name}: ${value}% complete`}
              />
              <span className="nx-proj-list__pct">{value}%</span>
            </div>
          );
        },
      },
      {
        key: 'startDate',
        header: 'Start',
        sortable: true,
        render: (project) => (
          <span className="nx-proj-list__date">{formatDate(project.startDate)}</span>
        ),
      },
      {
        key: 'endDate',
        header: 'Due',
        align: 'right',
        sortable: true,
        render: (project) => (
          <span className="nx-proj-list__date" data-late={isOverdue(project.endDate) || undefined}>
            {formatDate(project.endDate)}
            {/* The word beside the date: a red date alone is a colour-only
                signal, which fails anyone who cannot see it. */}
            {isOverdue(project.endDate) ? (
              <span className="nx-proj-list__late-flag">overdue</span>
            ) : null}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useDataTable({
    tableName: 'projects',
    columns,
    initialPageSize: 15,
  });

  const { data, isLoading, isFetching, isError, error, refetch } = useGetProjectsQuery(
    table.queryParams,
  );

  const rows = useMemo(() => data?.items ?? [], [data]);
  const status = table.filters.statusKey ?? 'all';

  /* The KPI row reads the page on screen — the same rows the table renders —
     so the tiles and the table can never disagree. `health` and an overdue
     end date are two views of the same risk, hence one combined tile. */
  const kpis = useMemo(() => {
    const inProgress = rows.filter((project) => project.statusKey === 'IN_PROGRESS').length;
    const atRisk = rows.filter(
      (project) =>
        project.health === 'AT_RISK' || project.health === 'OFF_TRACK' || isOverdue(project.endDate),
    ).length;
    const budget = rows.reduce((sum, project) => sum + (project.budget ?? 0), 0);
    const hasBudget = rows.some((project) => project.budget != null);

    const tiles = [
      {
        key: 'onscreen',
        label: 'On screen',
        value: String(rows.length),
        icon: <FiFolder size={14} />,
        tone: 'accent',
        hint: `Page ${data?.page ?? table.page} of ${data?.totalPages ?? 1}`,
      },
      {
        key: 'in-progress',
        label: 'In progress',
        value: String(inProgress),
        icon: <FiTrendingUp size={14} />,
        tone: inProgress > 0 ? 'accent' : 'neutral',
        hint: 'Moving on this page',
      },
      {
        key: 'at-risk',
        label: 'At risk or overdue',
        value: String(atRisk),
        icon: <FiAlertTriangle size={14} />,
        tone: atRisk > 0 ? 'danger' : 'success',
        hint: atRisk > 0 ? 'Needs a look' : 'Nothing flagged',
      },
    ];

    if (hasBudget) {
      tiles.push({
        key: 'budget',
        label: 'Budget',
        value: formatCurrency(budget, { currency, compact: true }),
        icon: <FiCreditCard size={14} />,
        tone: 'violet',
        hint: 'Across projects on this page',
      });
    }

    return tiles;
  }, [rows, data, table.page, currency]);

  const openProject = (project) =>
    navigate(vendorPath(appRoutes.vendor.projects.detail(project.id)));

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing projects');
  };

  if (isError) {
    return (
      <div className="page nx-proj-list">
        <Card padding="lg">
          <div className="nx-proj-list__error">
            <h1 className="nx-proj-list__error-title">Could not load projects</h1>
            <p className="nx-proj-list__error-text">
              {error?.data?.message ?? 'The project portfolio is unavailable right now.'}
            </p>
            <Button onClick={refetch}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page nx-proj-list">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Work</span>
          <h1 className="page__title">Projects</h1>
          <p className="page__subtitle">
            {isLoading
              ? 'Loading projects…'
              : `${data?.total ?? rows.length} ${
                  (data?.total ?? rows.length) === 1 ? 'project' : 'projects'
                } in the portfolio`}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} className={isFetching && !isLoading ? 'nx-spin' : ''} />}
            onClick={handleRefresh}
            aria-label="Refresh projects"
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
            searchPlaceholder="Name, code, customer, manager"
            columns={columns}
            visibleColumns={table.visibleColumns}
            onToggleColumn={table.toggleColumn}
            onRefresh={refetch}
            isFetching={isFetching}
            activeFilterCount={table.activeFilterCount}
            onClearFilters={table.clearFilters}
          >
            <div className="nx-segmented" role="group" aria-label="Filter by project status">
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
            onRowClick={openProject}
            isFiltered={table.isFiltered}
            itemLabel="projects"
            emptyIcon={<FiFolder />}
            emptyTitle={table.isFiltered ? 'No projects match' : 'No projects yet'}
            emptyDescription={
              table.isFiltered
                ? 'Try a different status filter or clear the search.'
                : 'Projects you start will appear here.'
            }
          />
        </Card>
      </div>
    </div>
  );
}
