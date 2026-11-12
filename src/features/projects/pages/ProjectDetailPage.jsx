/**
 * ArkCRM — ProjectDetailPage
 * ---------------------------------------------------------------------------
 * One project in full: identity and health, the milestone strip that answers
 * "where is it in the plan", and the task table that answers "what is left".
 *
 * Three queries run independently, so a missing milestone set cannot blank
 * the header — each section degrades on its own. The task query asks for
 * `pageSize: 200` because /projects/:id/tasks paginates *before* filtering by
 * project, so one large page plus local search, status tab and pagination is
 * the only way this table's counts can be trusted.
 */

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft, FiFolder, FiList, FiRefreshCw } from 'react-icons/fi';
import DataTable from '@/components/data-display/DataTable/DataTable';
import TableToolbar from '@/components/data-display/DataTable/TableToolbar';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import LoadingState from '@/components/feedback/LoadingState';
import { useGetProjectQuery, useGetTasksQuery, useGetMilestonesQuery } from '../api/projectsApi';
import { useNotify } from '@/hooks/useNotification';
import useVendorPath from '@/hooks/useVendorPath';
import { appRoutes } from '@/config/navigation.config';
import useDataTable from '@/hooks/useDataTable';
import { useTenant } from '@/hooks/useTenant';
import { formatCurrency } from '@/utils/currency';
import { formatDate, isOverdue } from '@/utils/date';
import './ProjectDetailPage.css';
import { serverMessage } from '@/utils/errorMessage';

const TASK_STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'TODO', label: 'To do' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'REVIEW', label: 'In review' },
  { id: 'DONE', label: 'Done' },
];

/* Milestones ship as bare status strings — unlike rows, they carry no
   `{ label, tone }` object — so the vocabulary lives here. */
const MILESTONE_STATUS = {
  DONE: { label: 'Done', tone: 'success' },
  IN_PROGRESS: { label: 'In progress', tone: 'accent' },
  PENDING: { label: 'Pending', tone: 'neutral' },
};

const HEALTH = {
  ON_TRACK: { label: 'On track', tone: 'success' },
  AT_RISK: { label: 'At risk', tone: 'warning' },
  OFF_TRACK: { label: 'Off track', tone: 'danger' },
};

const PRIORITY_TONE = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' };
const PRIORITY_LABEL = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const notify = useNotify();
  const vendorPath = useVendorPath();
  const { currency } = useTenant();

  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatus, setTaskStatus] = useState('all');

  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetProjectQuery(projectId, { skip: !projectId });

  const {
    data: milestones,
    isLoading: milestonesLoading,
    isError: milestonesError,
    refetch: refetchMilestones,
  } = useGetMilestonesQuery(projectId, { skip: !projectId });

  const {
    data: taskData,
    isLoading: tasksLoading,
    isFetching: tasksFetching,
    isError: tasksError,
    refetch: refetchTasks,
  } = useGetTasksQuery({ projectId, pageSize: 200 }, { skip: !projectId });

  const allTasks = useMemo(() => taskData?.items ?? [], [taskData]);

  const taskColumns = useMemo(
    () => [
      {
        key: 'title',
        header: 'Task',
        render: (task) => (
          <div className="nx-proj-detail__task">
            <strong className="nx-proj-detail__task-title">{task.title}</strong>
            <span className="nx-proj-detail__task-meta">
              {(task.labels ?? []).join(' · ') || 'No labels'}
            </span>
          </div>
        ),
      },
      {
        key: 'assignee',
        header: 'Assignee',
        sortable: true,
        render: (task) => <span className="nx-proj-detail__assignee">{task.assignee}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: false,
        render: (task) => (
          <Badge tone={task.status?.tone ?? 'neutral'} dot>
            {task.status?.label ?? task.statusKey}
          </Badge>
        ),
      },
      {
        key: 'priority',
        header: 'Priority',
        sortable: false,
        render: (task) => (
          <Badge tone={PRIORITY_TONE[task.priority] ?? 'neutral'}>
            {PRIORITY_LABEL[task.priority] ?? task.priority}
          </Badge>
        ),
      },
      {
        key: 'dueDate',
        header: 'Due',
        sortable: true,
        render: (task) => (
          <span className="nx-proj-detail__due" data-late={isOverdue(task.dueDate) || undefined}>
            {formatDate(task.dueDate)}
            {isOverdue(task.dueDate) && task.statusKey !== 'DONE' ? (
              <span className="nx-proj-detail__late-flag">overdue</span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'loggedHours',
        header: 'Hours',
        align: 'right',
        sortable: true,
        render: (task) => (
          <span className="nx-proj-detail__hours">
            {task.loggedHours}/{task.estimateHours}h
          </span>
        ),
      },
    ],
    [],
  );

  /* Search and the status tab are local: they run over the single task page
     the endpoint returns, so filtering never costs a round trip. */
  const taskTable = useDataTable({
    tableName: 'project-tasks',
    columns: taskColumns,
    initialPageSize: 20,
  });

  const tasks = useMemo(() => {
    const needle = taskSearch.trim().toLowerCase();
    return allTasks.filter((task) => {
      const matchesStatus = taskStatus === 'all' || task.statusKey === taskStatus;
      const matchesSearch =
        !needle ||
        task.title?.toLowerCase().includes(needle) ||
        task.assignee?.toLowerCase().includes(needle) ||
        (task.labels ?? []).join(' ').toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [allTasks, taskSearch, taskStatus]);

  const taskFiltered = Boolean(taskSearch.trim()) || taskStatus !== 'all';
  const milestoneList = Array.isArray(milestones) ? milestones : [];

  const listPath = vendorPath(appRoutes.vendor.projects.index);

  const handleRefresh = () => {
    refetch();
    notify.info('Refreshing project');
  };

  if (isLoading) {
    return (
      <div className="page nx-proj-detail">
        <LoadingState mode="skeleton" variant="detail" label="Loading project" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="page nx-proj-detail">
        <div className="page__header">
          <div>
            <Button
              variant="ghost"
              size="sm"
              to={listPath}
              leftIcon={<FiArrowLeft size={15} />}
              className="nx-proj-detail__back"
            >
              All projects
            </Button>
            <h1 className="page__title">Project not found</h1>
            <p className="page__subtitle">
              {serverMessage(error, `No project matches “${projectId}”. It may have been deleted.`)}
            </p>
          </div>
          <div className="page__actions">
            <Button variant="primary" size="sm" to={listPath} leftIcon={<FiArrowLeft size={15} />}>
              Back to projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const health = HEALTH[project.health] ?? { label: project.health ?? 'Unknown', tone: 'neutral' };

  return (
    <div className="page nx-proj-detail">
      <div className="page__header">
        <div>
          <Button
            variant="ghost"
            size="sm"
            to={listPath}
            leftIcon={<FiArrowLeft size={15} />}
            className="nx-proj-detail__back"
          >
            All projects
          </Button>
          <h1 className="page__title">{project.name}</h1>
          <p className="page__subtitle">
            {project.code} · {project.customer} · {project.manager}
          </p>
        </div>
        <div className="page__actions">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiRefreshCw size={15} />}
            onClick={handleRefresh}
            aria-label="Refresh project"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="page__body">
        {/* ---- identity + progress ---------------------------------------- */}
        <Card padding="md" className="nx-proj-detail__summary">
          <div className="nx-proj-detail__summary-head">
            <span className="nx-proj-detail__mark" aria-hidden="true">
              <FiFolder size={20} />
            </span>

            <div className="nx-proj-detail__badges">
              <Badge tone={project.status?.tone ?? 'neutral'} dot>
                {project.status?.label ?? project.statusKey}
              </Badge>
              <Badge tone={health.tone}>{health.label}</Badge>
            </div>

            <div className="nx-proj-detail__progress">
              <div className="nx-proj-detail__progress-head">
                <span className="nx-proj-detail__progress-label">Progress</span>
                <span className="nx-proj-detail__progress-value">{project.progress ?? 0}%</span>
              </div>
              <progress
                className="nx-proj-detail__progress-bar"
                value={project.progress ?? 0}
                max={100}
                aria-label={`${project.name}: ${project.progress ?? 0}% complete`}
              />
              <span className="nx-proj-detail__progress-meta">
                {project.tasksDone} of {project.tasksTotal} tasks done
              </span>
            </div>
          </div>

          <p className="nx-proj-detail__description">{project.description}</p>

          <dl className="nx-proj-detail__facts">
            <div>
              <dt>Budget</dt>
              <dd>{formatCurrency(project.budget ?? 0, { currency, compact: true })}</dd>
            </div>
            <div>
              <dt>Spent</dt>
              <dd>{formatCurrency(project.spent ?? 0, { currency, compact: true })}</dd>
            </div>
            <div>
              <dt>Team</dt>
              <dd>{project.teamSize} people</dd>
            </div>
            <div>
              <dt>Start</dt>
              <dd>{formatDate(project.startDate)}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd className="nx-proj-detail__fact-due" data-late={isOverdue(project.endDate) || undefined}>
                {formatDate(project.endDate)}
                {isOverdue(project.endDate) ? (
                  <span className="nx-proj-detail__late-flag">overdue</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Manager</dt>
              <dd>{project.manager}</dd>
            </div>
          </dl>
        </Card>

        {/* ---- milestones -------------------------------------------------- */}
        <section className="page__section" aria-labelledby="nx-proj-detail-milestones">
          <div className="page__section-title">
            <h2 id="nx-proj-detail-milestones" className="nx-proj-detail__section-title">
              Milestones
            </h2>
            {milestoneList.length > 0 ? (
              <span className="nx-proj-detail__section-meta">
                {milestoneList.filter((m) => m.status === 'DONE').length} of{' '}
                {milestoneList.length} complete
              </span>
            ) : null}
          </div>

          {milestonesLoading ? (
            <LoadingState mode="skeleton" variant="list" rows={1} label="Loading milestones" />
          ) : milestonesError ? (
            /* Degrade on its own: the milestone strip failing must not take
               the header or the task table down with it. */
            <div className="nx-alert nx-alert--warning" role="alert">
              <span className="nx-alert__icon" aria-hidden="true">
                <FiAlertTriangle size={16} />
              </span>
              <span>Milestones could not be loaded. The rest of this page is unaffected.</span>
              <button type="button" className="nx-link nx-link--sm" onClick={refetchMilestones}>
                Retry
              </button>
            </div>
          ) : milestoneList.length === 0 ? (
            <p className="nx-proj-detail__section-empty">
              No milestones have been planned for this project yet.
            </p>
          ) : (
            <ol className="nx-proj-detail__milestones">
              {milestoneList.map(({ id, name, status, dueDate }) => {
                const tone = MILESTONE_STATUS[status] ?? {
                  label: status ?? 'Pending',
                  tone: 'neutral',
                };
                return (
                  <li key={id} className="nx-proj-detail__milestone">
                    <span className="nx-proj-detail__milestone-name">{name}</span>
                    <span className="nx-proj-detail__milestone-foot">
                      <Badge tone={tone.tone}>{tone.label}</Badge>
                      <span className="nx-proj-detail__milestone-date">{formatDate(dueDate)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* ---- tasks ------------------------------------------------------- */}
        <section className="page__section" aria-labelledby="nx-proj-detail-tasks">
          <div className="page__section-title">
            <h2 id="nx-proj-detail-tasks" className="nx-proj-detail__section-title">
              Tasks
            </h2>
            <span className="nx-proj-detail__section-meta">{allTasks.length} in this project</span>
          </div>

          <Card padding="none">
            <TableToolbar
              search={taskSearch}
              onSearch={setTaskSearch}
              searchPlaceholder="Task, assignee or label"
              onRefresh={refetchTasks}
              isFetching={tasksFetching}
            >
              <div className="nx-segmented" role="group" aria-label="Filter tasks by status">
                {TASK_STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`nx-segmented__item${taskStatus === filter.id ? ' is-active' : ''}`}
                    aria-pressed={taskStatus === filter.id}
                    onClick={() => setTaskStatus(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </TableToolbar>

            <DataTable
              columns={taskColumns}
              data={tasks}
              loading={tasksLoading}
              skeleton
              clientSide
              hidePagination
              sortBy={taskTable.sortBy}
              sortOrder={taskTable.sortOrder}
              onSort={taskTable.toggleSort}
              visibleColumns={taskTable.visibleColumns}
              error={tasksError ? (serverMessage(tasksError, 'Tasks could not be loaded')) : null}
              onRetry={refetchTasks}
              isFiltered={taskFiltered}
              itemLabel="tasks"
              emptyIcon={<FiList />}
              emptyTitle={taskFiltered ? 'No tasks match' : 'No tasks yet'}
              emptyDescription={
                taskFiltered
                  ? 'Try a different status filter or clear the search.'
                  : 'Tasks added to this project will appear here.'
              }
            />
          </Card>
        </section>
      </div>
    </div>
  );
}
